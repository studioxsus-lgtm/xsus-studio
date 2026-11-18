"""Send an English prompt through the normal Future XSUS Core local pipeline."""

import argparse
import asyncio
import sqlite3
import sys
from pathlib import Path
from time import time_ns
from uuid import uuid4

from core.contracts.common import V1
from core.contracts.errors import EngineError
from core.contracts.request import Conversation, ConversationRole, ConversationTurn, EngineRequest
from core.contracts.response import EngineResponse, TextResult
from core.conversation.session_conversation import SessionConversation
from core.execution.local_runtime import create_local_executor
from core.sessions.session_store import SessionCapacityError, SessionNotFoundError, SessionRevisionError
from core.sessions.sqlite_store import SQLiteSessionStore

from ..engine.english_engine import ENGLISH, create_engine


async def run(
    prompt: str, follow_up: str | None, *, session_db: Path | None = None, session_id: str | None = None,
) -> int:
    executor = create_local_executor((create_engine(),))
    if session_id is not None and session_db is None:
        raise ValueError("--session-id requires --session-db")
    owner = "local-cli"
    conversation = None
    if session_db is not None:
        store = await asyncio.to_thread(SQLiteSessionStore, session_db)
        conversation = SessionConversation(executor, store)
        if session_id is None:
            session = await asyncio.to_thread(store.create, owner)
            session_id = session.session_id
            print(f"Session: {session_id}", file=sys.stderr)

    history: tuple[ConversationTurn, ...] = ()
    for text in (prompt, follow_up):
        if text is None:
            break
        deadline = time_ns() // 1_000_000 + 10_000
        if conversation is not None and session_id is not None:
            result = await conversation.execute(owner, session_id, text, language=ENGLISH, deadline_unix_ms=deadline)
        else:
            request = EngineRequest(
                uuid4().hex, uuid4().hex, V1, ENGLISH, deadline, Conversation(text, history),
            )
            result = await executor.execute(request)
        outcome = result.outcome if isinstance(result, EngineResponse) else result
        if isinstance(outcome, EngineError):
            print(f"{outcome.code}: {outcome.message}")
            return 1
        if not isinstance(outcome, TextResult):
            raise RuntimeError("English conversation returned an unexpected result")
        print(outcome.text)
        if conversation is None:
            history += (
                ConversationTurn(ConversationRole.USER, text),
                ConversationTurn(ConversationRole.ASSISTANT, outcome.text),
            )
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("prompt")
    parser.add_argument("--follow-up")
    parser.add_argument("--session-db", type=Path, help="SQLite database for conversation history")
    parser.add_argument("--session-id", help="Resume a session previously created in the database")
    args = parser.parse_args()
    if args.session_id is not None and args.session_db is None:
        parser.error("--session-id requires --session-db")
    try:
        status = asyncio.run(run(args.prompt, args.follow_up, session_db=args.session_db, session_id=args.session_id))
    except sqlite3.Error as error:
        parser.exit(1, f"Session database error: {error}\n")
    except (SessionCapacityError, SessionNotFoundError, SessionRevisionError, ValueError) as error:
        parser.exit(1, f"{error}\n")
    raise SystemExit(status)


if __name__ == "__main__":
    main()
