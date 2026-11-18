"""Execute a conversation request against a versioned session."""

import asyncio
from typing import Protocol
from uuid import uuid4

from core.contracts.common import LanguageTag, V1
from core.contracts.request import EngineRequest
from core.contracts.response import EngineResponse, TextResult
from core.execution.request_executor import ExecutionResult, RequestExecutor
from core.sessions.session_store import SessionRevisionError, SessionSnapshot


class ConversationHistory(Protocol):
    def get(self, owner_id: str, session_id: str) -> SessionSnapshot: ...

    def append_exchange(
        self, owner_id: str, session_id: str, *,
        expected_revision: int, user_text: str, assistant_text: str,
    ) -> SessionSnapshot: ...


class SessionConversation:
    def __init__(self, executor: RequestExecutor, history: ConversationHistory) -> None:
        self._executor = executor
        self._history = history

    async def execute(
        self, owner_id: str, session_id: str, text: str, *,
        language: LanguageTag, deadline_unix_ms: int, expected_revision: int | None = None,
    ) -> ExecutionResult:
        """Return a successful response only after its exchange is saved."""
        if expected_revision is not None and (type(expected_revision) is not int or expected_revision < 0):
            raise ValueError("Expected revision must be a nonnegative integer")
        snapshot = await asyncio.to_thread(self._history.get, owner_id, session_id)
        if expected_revision is not None and snapshot.revision != expected_revision:
            raise SessionRevisionError("Conversation session revision changed")
        request = EngineRequest(
            uuid4().hex, uuid4().hex, V1, language, deadline_unix_ms, snapshot.conversation(text),
        )
        response = await self._executor.execute(request)
        if isinstance(response, EngineResponse) and isinstance(response.outcome, TextResult):
            await asyncio.to_thread(
                self._history.append_exchange, owner_id, session_id,
                expected_revision=snapshot.revision, user_text=text, assistant_text=response.outcome.text,
            )
        return response
