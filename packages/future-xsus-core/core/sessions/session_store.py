"""Bounded, process-local conversation history for Future XSUS Core."""

from dataclasses import dataclass
from threading import Lock
from uuid import uuid4

from core.contracts.common import require_identifier
from core.contracts.request import Conversation, ConversationRole, ConversationTurn


class SessionNotFoundError(LookupError):
    """The session is absent from the caller's owner scope."""


class SessionCapacityError(RuntimeError):
    """The store has reached its configured number of sessions."""


class SessionRevisionError(RuntimeError):
    """The history changed after the caller took its snapshot."""


@dataclass(frozen=True, slots=True)
class SessionSnapshot:
    session_id: str
    revision: int
    history: tuple[ConversationTurn, ...]

    def conversation(self, text: str) -> Conversation:
        """Build a contract operation from this exact version of the history."""
        return Conversation(text, self.history)


class InMemorySessionStore:
    def __init__(
        self,
        *,
        max_sessions: int = 128,
        max_exchanges: int = 8,
        max_history_chars: int = 16_384,
    ) -> None:
        limits = {
            "max_sessions": max_sessions,
            "max_exchanges": max_exchanges,
            "max_history_chars": max_history_chars,
        }
        for name, value in limits.items():
            if type(value) is not int or value < 1:
                raise ValueError(f"{name} must be a positive integer")
        self._max_sessions = max_sessions
        self._max_exchanges = max_exchanges
        self._max_history_chars = max_history_chars
        self._sessions: dict[tuple[str, str], SessionSnapshot] = {}
        self._lock = Lock()

    def create(self, owner_id: str) -> SessionSnapshot:
        require_identifier(owner_id, "owner_id")
        with self._lock:
            if len(self._sessions) >= self._max_sessions:
                raise SessionCapacityError("Conversation session capacity reached")
            snapshot = SessionSnapshot(uuid4().hex, 0, ())
            self._sessions[(owner_id, snapshot.session_id)] = snapshot
            return snapshot

    def get(self, owner_id: str, session_id: str) -> SessionSnapshot:
        key = self._session_key(owner_id, session_id)
        with self._lock:
            return self._require_session(key)

    def delete(self, owner_id: str, session_id: str) -> None:
        key = self._session_key(owner_id, session_id)
        with self._lock:
            self._require_session(key)
            del self._sessions[key]

    def append_exchange(
        self,
        owner_id: str,
        session_id: str,
        *,
        expected_revision: int,
        user_text: str,
        assistant_text: str,
    ) -> SessionSnapshot:
        """Commit a complete exchange after a successful response."""
        key = self._session_key(owner_id, session_id)
        if type(expected_revision) is not int or expected_revision < 0:
            raise ValueError("expected_revision must be a nonnegative integer")
        user_turn = ConversationTurn(ConversationRole.USER, user_text)
        assistant_turn = ConversationTurn(ConversationRole.ASSISTANT, assistant_text)
        if len(user_text) + len(assistant_text) > self._max_history_chars:
            raise ValueError("Exchange exceeds the history character limit")

        with self._lock:
            current = self._require_session(key)
            if current.revision != expected_revision:
                raise SessionRevisionError("Conversation session revision changed")
            history = current.history + (user_turn, assistant_turn)
            history = history[-2 * self._max_exchanges:]
            chars = sum(len(turn.text) for turn in history)
            start = 0
            while chars > self._max_history_chars:
                chars -= len(history[start].text) + len(history[start + 1].text)
                start += 2
            updated = SessionSnapshot(session_id, current.revision + 1, history[start:])
            self._sessions[key] = updated
            return updated

    @staticmethod
    def _session_key(owner_id: str, session_id: str) -> tuple[str, str]:
        require_identifier(owner_id, "owner_id")
        require_identifier(session_id, "session_id")
        return owner_id, session_id

    def _require_session(self, key: tuple[str, str]) -> SessionSnapshot:
        snapshot = self._sessions.get(key)
        if snapshot is None:
            raise SessionNotFoundError("Conversation session not found")
        return snapshot
