"""Consistent SQLite read snapshot for approved English feedback.

A single SELECT is evaluated against one SQLite read view. This module
copies the approved examples into immutable records; it does not make
the existing trainer consume them or lock writers during training.
"""
from dataclasses import dataclass
import hashlib
import json
from .feedback_store import SQLiteFeedbackStore


@dataclass(frozen=True, slots=True)
class FrozenLanguageExampleV1:
    example_id: str
    prompt: str
    history: tuple[tuple[str, str], ...]
    response: str


@dataclass(frozen=True, slots=True)
class TransactionalLearningSnapshotV1:
    owner_id: str
    examples: tuple[FrozenLanguageExampleV1, ...]
    sha256: str

    @property
    def count(self) -> int:
        return len(self.examples)


def capture_transactional_learning_snapshot_v1(
    store: SQLiteFeedbackStore, owner_id: str
) -> TransactionalLearningSnapshotV1:
    if not isinstance(store, SQLiteFeedbackStore):
        raise ValueError("Persistent SQLiteFeedbackStore required")
    if type(owner_id) is not str or not owner_id.strip():
        raise ValueError("Valid owner_id required")
    # SQLiteFeedbackStore.accepted executes one SELECT, yielding a
    # consistent statement-level view even if writers commit later.
    records = store.accepted(owner_id)
    examples = tuple(sorted((
        FrozenLanguageExampleV1(
            record.example_id,
            record.example.conversation.text,
            tuple((turn.role.value, turn.text) for turn in record.example.conversation.history),
            record.example.response,
        ) for record in records
    ), key=lambda example: example.example_id))
    payload = [
        (example.example_id, example.prompt, example.history, example.response)
        for example in examples
    ]
    digest = hashlib.sha256(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return TransactionalLearningSnapshotV1(owner_id, examples, digest)


def compare_transactional_learning_snapshot_v1(
    store: SQLiteFeedbackStore, snapshot: TransactionalLearningSnapshotV1
) -> dict:
    if not isinstance(snapshot, TransactionalLearningSnapshotV1):
        raise ValueError("TransactionalLearningSnapshotV1 required")
    latest = capture_transactional_learning_snapshot_v1(store, snapshot.owner_id)
    return {
        "contract": "future-xsus-core.transactional-learning-snapshot.v1",
        "unchanged": latest.sha256 == snapshot.sha256 and latest.examples == snapshot.examples,
        "snapshot_count": snapshot.count,
        "latest_count": latest.count,
        "statement_consistent_read": True,
        "training_uses_frozen_snapshot": False,
        "production_activation_authorized": False,
    }
