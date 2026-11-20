"""Immutable fingerprint of owner-approved feedback for drift detection.

This is a consistency check, not an atomic database snapshot or an
authentication boundary.
"""
from dataclasses import dataclass
import hashlib
import json
from .feedback_store import SQLiteFeedbackStore


@dataclass(frozen=True, slots=True)
class FeedbackSnapshotV1:
    owner_id: str
    example_ids: tuple[str, ...]
    digest: str
    count: int


def capture_feedback_snapshot_v1(store: SQLiteFeedbackStore, owner_id: str) -> FeedbackSnapshotV1:
    if not isinstance(store, SQLiteFeedbackStore):
        raise ValueError("Persistent SQLiteFeedbackStore required")
    if type(owner_id) is not str or not owner_id.strip():
        raise ValueError("Valid owner_id required")
    records = store.accepted(owner_id)
    entries = sorted(
        (record.example_id, record.status, record.example.conversation.text,
         tuple((turn.role.value, turn.text) for turn in record.example.conversation.history),
         record.example.response)
        for record in records
    )
    digest = hashlib.sha256(json.dumps(entries, ensure_ascii=False, separators=(",", ":")).encode("utf-8")).hexdigest()
    return FeedbackSnapshotV1(owner_id, tuple(row[0] for row in entries), digest, len(entries))


def verify_feedback_snapshot_v1(store: SQLiteFeedbackStore, snapshot: FeedbackSnapshotV1) -> dict:
    if not isinstance(snapshot, FeedbackSnapshotV1):
        raise ValueError("FeedbackSnapshotV1 required")
    current = capture_feedback_snapshot_v1(store, snapshot.owner_id)
    unchanged = current == snapshot
    return {
        "contract": "future-xsus-core.feedback-snapshot.v1",
        "unchanged": unchanged,
        "approved_count_before": snapshot.count,
        "approved_count_after": current.count,
        "training_authorized": False,
        "atomic_snapshot_guaranteed": False,
    }


def require_unchanged_feedback_v1(store: SQLiteFeedbackStore, snapshot: FeedbackSnapshotV1) -> None:
    if not verify_feedback_snapshot_v1(store, snapshot)["unchanged"]:
        raise ValueError("Approved feedback changed during learning cycle")
