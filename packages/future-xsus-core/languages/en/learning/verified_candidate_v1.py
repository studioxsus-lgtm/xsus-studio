"""Opt-in verified candidate entrypoint for English language learning.

Reads the accepted owner-scoped IDs from SQLite and verifies them before
delegating to the existing non-regression-gated candidate trainer.
"""
from .feedback_store import SQLiteFeedbackStore
from .verified_feedback_v1 import (
    VerifiedFeedbackRequestV1, verify_approved_language_feedback_v1,
)
from .continual import build_candidate


def build_verified_language_candidate_v1(
    store: SQLiteFeedbackStore, owner_id: str, *, domain: str,
    **training_options,
) -> dict:
    if not isinstance(store, SQLiteFeedbackStore):
        raise ValueError("Persistent SQLiteFeedbackStore required")
    if type(owner_id) is not str or not owner_id.strip():
        raise ValueError("Valid owner_id required")
    # Read IDs from the store rather than accepting a caller-supplied
    # list or caller-supplied review-status boolean.
    accepted = store.accepted(owner_id)
    if len(accepted) < 5:
        raise ValueError("At least five approved language examples required")
    verification = verify_approved_language_feedback_v1(
        store, VerifiedFeedbackRequestV1(
            owner_id=owner_id,
            example_ids=tuple(record.example_id for record in accepted),
            domain=domain,
        ),
    )
    # The underlying trainer reads approved records again and enforces
    # its existing benchmark and held-out-feedback promotion gate.
    candidate = build_candidate(store, owner_id, **training_options)
    return {
        "contract": "future-xsus-core.verified-language-candidate.v1",
        "verification": verification,
        "candidate": candidate,
        "automatic_promotion_authorized": False,
        "semantic_scope_verified": False,
        "owner_authenticated_by_this_function": False,
    }
