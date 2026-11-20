"""Fail-closed review gate for staged English language checkpoints.

This is a point-in-time advisory check. It never approves deployment.
"""
from pathlib import Path
from .candidate_registry_v1 import SQLiteCandidateRegistryV1
from .artifact_staging_v1 import verify_staged_candidate_v1


def assess_staged_review_v1(
    registry: SQLiteCandidateRegistryV1,
    owner_id: str,
    candidate_id: str,
    staging_root: str | Path,
) -> dict:
    """Return review eligibility; fail closed on absent or damaged artifacts."""
    if not isinstance(registry, SQLiteCandidateRegistryV1):
        raise ValueError("SQLiteCandidateRegistryV1 required")
    record = registry.get(owner_id, candidate_id)
    reasons = []
    if record.status != "pending_human_review":
        reasons.append("candidate_not_pending_review")
    try:
        integrity = verify_staged_candidate_v1(
            registry, owner_id, candidate_id, staging_root
        )
    except (OSError, ValueError):
        integrity = None
        reasons.append("staged_artifact_unavailable_or_invalid")
    if integrity is not None:
        if integrity.get("integrity_verified") is not True:
            reasons.append("staged_artifact_integrity_failed")
        if integrity.get("eligible_for_human_review") is not True:
            reasons.append("staged_artifact_not_review_eligible")
    return {
        "contract": "future-xsus-core.staged-review-gate.v1",
        "candidate_id": record.candidate_id,
        "status": "blocked" if reasons else "ready_for_human_review",
        "reasons": list(dict.fromkeys(reasons)),
        "review_eligible_at_check": not reasons,
        "release_authorized": False,
        "verification_is_continuous": False,
    }
