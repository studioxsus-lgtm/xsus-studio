"""Durable conversation sessions backed by a local SQLite database."""

from collections.abc import Iterator
from contextlib import closing, contextmanager
import json
from pathlib import Path
import sqlite3
from uuid import uuid4

from core.contracts.common import require_identifier
from core.contracts.request import ConversationRole, ConversationTurn

from .session_store import (
    SessionCapacityError,
    SessionNotFoundError,
    SessionSnapshot,
    _SessionLimits,
    _session_key,
)


class SQLiteSessionStore:
    """Persist complete exchanges and serialize writers across store instances."""

    def __init__(
        self,
        path: str | Path,
        *,
        max_sessions: int = 128,
        max_exchanges: int = 8,
        max_history_chars: int = 16_384,
    ) -> None:
        if not str(path) or str(path) == ":memory:":
            raise ValueError("SQLite sessions require a persistent database path")
        self._path = Path(path).absolute()
        self._limits = _SessionLimits(max_sessions, max_exchanges, max_history_chars)
        config = json.dumps([max_sessions, max_exchanges, max_history_chars])
        with self._connection(write=True) as connection:
            connection.execute("""
                CREATE TABLE IF NOT EXISTS xsus_sessions_v1 (
                    owner_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    revision INTEGER NOT NULL CHECK (revision >= 0),
                    history TEXT NOT NULL,
                    PRIMARY KEY (owner_id, session_id)
                )
            """)
            connection.execute("""
                CREATE TABLE IF NOT EXISTS xsus_session_settings_v1 (
                    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
                    limits TEXT NOT NULL
                )
            """)
            connection.execute(
                "INSERT OR IGNORE INTO xsus_session_settings_v1 VALUES (1, ?)", (config,),
            )
            (saved_config,) = connection.execute(
                "SELECT limits FROM xsus_session_settings_v1 WHERE singleton = 1",
            ).fetchone()
            if saved_config != config:
                raise ValueError("Session limits must match the existing SQLite database")

    def create(self, owner_id: str) -> SessionSnapshot:
        require_identifier(owner_id, "owner_id")
        with self._connection(write=True) as connection:
            (count,) = connection.execute("SELECT COUNT(*) FROM xsus_sessions_v1").fetchone()
            if count >= self._limits.max_sessions:
                raise SessionCapacityError("Conversation session capacity reached")
            snapshot = SessionSnapshot(uuid4().hex, 0, ())
            connection.execute(
                "INSERT INTO xsus_sessions_v1 (owner_id, session_id, revision, history) VALUES (?, ?, 0, '[]')",
                (owner_id, snapshot.session_id),
            )
        return snapshot

    def get(self, owner_id: str, session_id: str) -> SessionSnapshot:
        key = _session_key(owner_id, session_id)
        with self._connection() as connection:
            return self._read(connection, key)

    def delete(self, owner_id: str, session_id: str) -> None:
        key = _session_key(owner_id, session_id)
        with self._connection(write=True) as connection:
            result = connection.execute(
                "DELETE FROM xsus_sessions_v1 WHERE owner_id = ? AND session_id = ?", key,
            )
            if result.rowcount == 0:
                raise SessionNotFoundError("Conversation session not found")

    def append_exchange(
        self,
        owner_id: str,
        session_id: str,
        *,
        expected_revision: int,
        user_text: str,
        assistant_text: str,
    ) -> SessionSnapshot:
        key = _session_key(owner_id, session_id)
        exchange = self._limits.exchange(expected_revision, user_text, assistant_text)
        with self._connection(write=True) as connection:
            current = self._read(connection, key)
            updated = self._limits.append(current, expected_revision, exchange)
            history = json.dumps([(turn.role.value, turn.text) for turn in updated.history])
            connection.execute(
                "UPDATE xsus_sessions_v1 SET revision = ?, history = ? WHERE owner_id = ? AND session_id = ?",
                (updated.revision, history, *key),
            )
        return updated

    @contextmanager
    def _connection(self, *, write: bool = False) -> Iterator[sqlite3.Connection]:
        with closing(sqlite3.connect(self._path, isolation_level=None)) as connection:
            with connection:
                if write:
                    # Lock before reading a revision or counting sessions.
                    connection.execute("BEGIN IMMEDIATE")
                yield connection

    @staticmethod
    def _read(connection: sqlite3.Connection, key: tuple[str, str]) -> SessionSnapshot:
        row = connection.execute(
            "SELECT revision, history FROM xsus_sessions_v1 WHERE owner_id = ? AND session_id = ?", key,
        ).fetchone()
        if row is None:
            raise SessionNotFoundError("Conversation session not found")
        revision, encoded = row
        history = tuple(ConversationTurn(ConversationRole(role), text) for role, text in json.loads(encoded))
        return SessionSnapshot(key[1], revision, history)
