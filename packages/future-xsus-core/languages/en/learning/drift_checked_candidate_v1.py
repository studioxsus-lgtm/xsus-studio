"""Opt-in English candidate training with before/after feedback drift checks.

Training still reads from the existing SQLite store; this is not a
transactional snapshot. A drifted candidate must be quarantined by
its caller and never promoted.
"""
from .feedback_store import SQLiteFeedbackStore
from .feedback_snapshot_v1 import (
    capture_feedback_snapshot_v1, verify_feedback_snapshot_v1,
)
from .verified_candidate_v1 import build_verified_language_candidate_v1


def build_drift_checked_language_candidate_v1(
    store: SQLiteFeedbackStore, owner_id: str, *, domain: str, **training_options
) -> dict:
    snapshot = capture_feedback_snapshot_v1(store, owner_id)
    if snapshot.count < 5:
        raise ValueError("At least five approved language examples required")
    # Check before delegation and after it returns. This does not
    # prevent transient changes or concurrent modifications.
    candidate = build_verified_language_candidate_v1(
        store, owner_id, domain=domain, **training_options
    )
    drift = verify_feedback_snapshot_v1(store, snapshot)
    return {
        "contract": "future-xsus-core.drift-checked-language-candidate.v1",
        "candidate": candidate,
        "feedback_integrity": drift,
        "eligible_for_human_review": bool(
            drift["unchanged"] and
            candidate.get("candidate", {}).get("eligible_for_promotion", False)
        ),
        "automatic_promotion_authorized": False,
        "transactional_snapshot_guaranteed": False,
    }
