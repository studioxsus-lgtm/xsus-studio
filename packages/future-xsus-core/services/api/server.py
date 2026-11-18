"""Start the Future XSUS Core conversation API on a loopback address."""

import argparse
import os
import re
import sqlite3
from pathlib import Path

from aiohttp import web

from core.contracts.common import require_identifier
from core.conversation.session_conversation import SessionConversation
from core.execution.local_runtime import create_local_executor
from core.sessions.sqlite_store import SQLiteSessionStore
from languages.en.engine.english_engine import ENGLISH, create_engine

from .app import create_app

_LOOPBACK_HOSTS = ("127.0.0.1", "::1")


def create_local_app(database: Path, *, owner: str, token: str) -> web.Application:
    require_identifier(owner, "owner_id")
    if re.fullmatch(r"[A-Za-z0-9._~-]{32,256}", token) is None:
        raise ValueError("XSUS_API_TOKEN must contain 32–256 URL-safe characters")
    executor = create_local_executor((create_engine(),))
    store = SQLiteSessionStore(database)
    return create_app(
        store=store,
        conversation=SessionConversation(executor, store),
        owner_tokens={owner: token},
        supported_languages=frozenset({ENGLISH}),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, required=True, help="SQLite database for sessions")
    parser.add_argument("--host", choices=_LOOPBACK_HOSTS, default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    if not 1 <= args.port <= 65_535:
        parser.error("--port must be between 1 and 65535")
    try:
        app = create_local_app(
            args.database, owner=os.environ.get("XSUS_API_OWNER", "local-api"),
            token=os.environ.get("XSUS_API_TOKEN", ""),
        )
        web.run_app(app, host=args.host, port=args.port, access_log=None)
    except (OSError, ValueError, sqlite3.Error) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
