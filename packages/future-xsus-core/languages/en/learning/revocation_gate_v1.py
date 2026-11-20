"""Post-training revocation gate for frozen English feedback candidates.

Opt-in only: a check at completion cannot prevent revocation immediately
after the check, nor does it delete an already-created model artifact.
"""
from .feedback_store import SQLiteFeedbackStore
from .transactional_snapshot_v1 import (
    capture_transactional_learning_snapshot_v1,
    compare_transactional_learning_snapshot_v1,
)
from .frozen_candidate_v1 import build_frozen_language_candidate_v1


def build_revocation_checked_candidate_v1(
    store: SQLiteFeedbackStore, owner_id: str, *, domain: str, **training_options
) -> dict:
    before = capture_transactional_learning_snapshot_v1(store, owner_id)
    if before.count < 5:
        raise ValueError("At least five approved language examples required")
    candidate = build_frozen_language_candidate_v1(
        store, owner_id, domain=domain, **training_options
    )
    after = compare_transactional_learning_snapshot_v1(store, before)
    same_training_set = (
        candidate.get("snapshot_sha256") == before.sha256
        and candidate.get("snapshot_example_count") == before.count
        and candidate.get("training_uses_frozen_feedback") is True
    )
    candidate_gate = candidate.get("candidate", {})
    candidate_eligible = (
        isinstance(candidate_gate, dict)
        and candidate_gate.get("eligible_for_promotion") is True
    )
    reasons = []
    if not after["unchanged"]:
        reasons.append("approved_feedback_changed")
    if not same_training_set:
        reasons.append("training_snapshot_mismatch")
    if not candidate_eligible:
        reasons.append("candidate_quality_gate_not_passed")
    return {
        "contract": "future-xsus-core.revocation-gate.v1",
        "snapshot_sha256": before.sha256,
        "snapshot_count": before.count,
        "feedback_unchanged_at_completion": after["unchanged"],
        "candidate_snapshot_matches": same_training_set,
        "eligible_for_human_review": not reasons,
        "reasons": reasons,
        "automatic_promotion_authorized": False,
        "continuous_revocation_enforcement": False,
        "production_activation_authorized": False,
    }
