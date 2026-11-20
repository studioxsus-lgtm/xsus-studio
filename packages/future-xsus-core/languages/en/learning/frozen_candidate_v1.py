"""Train an English candidate using a captured immutable feedback dataset.

The existing candidate trainer is reused with a store adapter whose
accepted() returns only the captured records, never a fresh SQLite read.
"""
from .feedback_store import FeedbackRecord, SQLiteFeedbackStore
from .transactional_snapshot_v1 import capture_transactional_learning_snapshot_v1
from .verified_feedback_v1 import (
    VerifiedFeedbackRequestV1, verify_approved_language_feedback_v1,
)
from .continual import build_candidate
from languages.en.data.preparation.corpus import parse_example


class _FrozenFeedbackStore(SQLiteFeedbackStore):
    """Adapter preserving the trainer's existing SQLiteFeedbackStore API."""

    def __init__(self, source: SQLiteFeedbackStore, owner_id: str, snapshot):
        # No database initialization or writes: this adapter is read-only.
        self._path = source.path
        self._owner_id = owner_id
        self._records = tuple(
            FeedbackRecord(
                example_id=entry.example_id,
                status="accepted",
                example=parse_example({
                    "prompt": entry.prompt,
                    "history": [{"role": role, "text": text} for role, text in entry.history],
                    "response": entry.response,
                }),
                submitted_at="",
            )
            for entry in snapshot.examples
        )

    def accepted(self, owner_id: str) -> tuple[FeedbackRecord, ...]:
        if owner_id != self._owner_id:
            raise ValueError("Frozen feedback owner mismatch")
        return self._records


def build_frozen_language_candidate_v1(
    store: SQLiteFeedbackStore, owner_id: str, *, domain: str, **training_options
) -> dict:
    if not isinstance(store, SQLiteFeedbackStore):
        raise ValueError("Persistent SQLiteFeedbackStore required")
    snapshot = capture_transactional_learning_snapshot_v1(store, owner_id)
    if snapshot.count < 5:
        raise ValueError("At least five approved language examples required")
    verification = verify_approved_language_feedback_v1(
        store, VerifiedFeedbackRequestV1(
            owner_id=owner_id,
            example_ids=tuple(entry.example_id for entry in snapshot.examples),
            domain=domain,
        ),
    )
    frozen_store = _FrozenFeedbackStore(store, owner_id, snapshot)
    candidate = build_candidate(frozen_store, owner_id, **training_options)
    return {
        "contract": "future-xsus-core.frozen-language-candidate.v1",
        "snapshot_sha256": snapshot.sha256,
        "snapshot_example_count": snapshot.count,
        "verification": verification,
        "candidate": candidate,
        "training_uses_frozen_feedback": True,
        "automatic_promotion_authorized": False,
        "semantic_scope_verified": False,
        "owner_authenticated_by_this_function": False,
    }
