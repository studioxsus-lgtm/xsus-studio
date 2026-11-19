"""Consent-gated, owner-scoped SQLite storage for English learning examples."""

from collections.abc import Iterator
from contextlib import closing, contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sqlite3

from core.contracts.common import require_identifier, require_text
from languages.en.data.preparation.corpus import Example, parse_example

_TABLE = "xsus_en_feedback_v1"
_MAX_EXAMPLE_CHARS = 24_000


@dataclass(frozen=True, slots=True)
class FeedbackRecord:
    example_id: str
    status: str
    example: Example
    submitted_at: str


class SQLiteFeedbackStore:
    """Store only examples whose owner explicitly consents to local retention."""

    def __init__(self, path: str | Path) -> None:
        if not str(path) or str(path) == ":memory:":
            raise ValueError("Feedback requires a persistent, local SQLite database path")
        self._path = Path(path).absolute()
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with self._connection(write=True) as connection:
            connection.execute(f"""
                CREATE TABLE IF NOT EXISTS {_TABLE} (
                    owner_id TEXT NOT NULL,
                    example_id TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    history_json TEXT NOT NULL,
                    response TEXT NOT NULL,
                    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
                    submitted_at TEXT NOT NULL,
                    reviewed_at TEXT,
                    PRIMARY KEY (owner_id, example_id)
                )
            """)

    @property
    def path(self) -> Path:
        """Return the absolute local path used for private feedback records."""
        return self._path

    def submit(self, owner_id: str, example: Example, *, consent: bool) -> FeedbackRecord:
        require_identifier(owner_id, "owner_id")
        if consent is not True:
            raise ValueError("Explicit consent is required before feedback can be stored")
        if not isinstance(example, Example):
            raise ValueError("Expected a validated English conversation example")
        conversation = example.conversation
        require_text(conversation.text, "prompt")
        require_text(example.response, "response")
        total_chars = len(conversation.text) + len(example.response) + sum(len(turn.text) for turn in conversation.history)
        if total_chars > _MAX_EXAMPLE_CHARS:
            raise ValueError("Learning example exceeds the local retention limit")
        payload = {
            "prompt": " ".join(conversation.text.casefold().split()),
            "history": [(turn.role.value, " ".join(turn.text.casefold().split())) for turn in conversation.history],
            "response": " ".join(example.response.split()),
        }
        example_id = hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()
        history = json.dumps(
            [{"role": turn.role.value, "text": turn.text} for turn in conversation.history],
            ensure_ascii=False, separators=(",", ":"),
        )
        submitted_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with self._connection(write=True) as connection:
            connection.execute(
                f"""INSERT OR IGNORE INTO {_TABLE}
                    (owner_id, example_id, prompt, history_json, response, status, submitted_at)
                    VALUES (?, ?, ?, ?, ?, 'pending', ?)""",
                (owner_id, example_id, conversation.text, history, example.response, submitted_at),
            )
            row = connection.execute(
                f"SELECT prompt, history_json, response, status, submitted_at FROM {_TABLE} "
                "WHERE owner_id = ? AND example_id = ?",
                (owner_id, example_id),
            ).fetchone()
        assert row is not None
        return self._record(example_id, row)

    def review(self, owner_id: str, example_id: str, *, approved: bool) -> FeedbackRecord:
        require_identifier(owner_id, "owner_id")
        if not isinstance(example_id, str) or len(example_id) != 64 or any(char not in "0123456789abcdef" for char in example_id):
            raise ValueError("Invalid learning example ID")
        if type(approved) is not bool:
            raise ValueError("Review decision must be a boolean")
        status = "accepted" if approved else "rejected"
        reviewed_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with self._connection(write=True) as connection:
            row = connection.execute(
                f"SELECT prompt, history_json, response, status, submitted_at FROM {_TABLE} "
                "WHERE owner_id = ? AND example_id = ?",
                (owner_id, example_id),
            ).fetchone()
            if row is None:
                raise KeyError("Learning example not found for this owner")
            if row[3] == "pending":
                connection.execute(
                    f"UPDATE {_TABLE} SET status = ?, reviewed_at = ? WHERE owner_id = ? AND example_id = ?",
                    (status, reviewed_at, owner_id, example_id),
                )
                row = (*row[:3], status, row[4])
            elif row[3] != status:
                raise ValueError("A reviewed learning decision cannot be changed; remove and resubmit the example")
        return self._record(example_id, row)

    def accepted(self, owner_id: str) -> tuple[FeedbackRecord, ...]:
        require_identifier(owner_id, "owner_id")
        with self._connection() as connection:
            rows = connection.execute(
                f"SELECT example_id, prompt, history_json, response, status, submitted_at FROM {_TABLE} "
                "WHERE owner_id = ? AND status = 'accepted' ORDER BY example_id", (owner_id,),
            ).fetchall()
        return tuple(self._record(row[0], row[1:]) for row in rows)

    def pending_ids(self, owner_id: str, *, limit: int = 100) -> tuple[str, ...]:
        require_identifier(owner_id, "owner_id")
        if type(limit) is not int or not 1 <= limit <= 1000:
            raise ValueError("Pending-example limit must be between 1 and 1000")
        with self._connection() as connection:
            rows = connection.execute(
                f"SELECT example_id FROM {_TABLE} WHERE owner_id = ? AND status = 'pending' "
                "ORDER BY submitted_at, example_id LIMIT ?",
                (owner_id, limit),
            ).fetchall()
        return tuple(row[0] for row in rows)

    def forget(self, owner_id: str, example_id: str) -> bool:
        require_identifier(owner_id, "owner_id")
        with self._connection(write=True) as connection:
            result = connection.execute(
                f"DELETE FROM {_TABLE} WHERE owner_id = ? AND example_id = ?", (owner_id, example_id),
            )
        return result.rowcount > 0

    @staticmethod
    def _record(example_id: str, row: tuple) -> FeedbackRecord:
        prompt, history_json, response, status, submitted_at = row
        history = json.loads(history_json)
        example = parse_example({"prompt": prompt, "history": history, "response": response})
        return FeedbackRecord(example_id, status, example, submitted_at)

    @contextmanager
    def _connection(self, *, write: bool = False) -> Iterator[sqlite3.Connection]:
        with closing(sqlite3.connect(self._path, isolation_level=None)) as connection:
            with connection:
                if write:
                    connection.execute("BEGIN IMMEDIATE")
                yield connection
