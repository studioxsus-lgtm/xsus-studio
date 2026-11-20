"""Read-only freshness check for an earlier staged-review observation.

Never treat a previous report or audit row as permission to deploy.
"""
from pathlib import Path

from .candidate_registry_v1 import SQLiteCandidateRegistryV1
from .review_audit_v1 import SQLiteReviewAuditV1
from .staged_review_gate_v1 import assess_staged_review_v1


def check_review_freshness_v1(
    registry: SQLiteCandidateRegistryV1,
    audit: SQLiteReviewAuditV1,
    owner_id: str,
    candidate_id: str,
    staging_root: str | Path,
    expected_audit_sequence: int,
) -> dict:
    if not isinstance(registry, SQLiteCandidateRegistryV1):
        raise ValueError("SQLiteCandidateRegistryV1 required")
    if not isinstance(audit, SQLiteReviewAuditV1):
        raise ValueError("SQLiteReviewAuditV1 required")
    if type(expected_audit_sequence) is not int or expected_audit_sequence <= 0:
        raise ValueError("Positive audit sequence required")
    before = registry.get(owner_id, candidate_id)
    history = audit.history(owner_id, candidate_id, limit=1)
    reasons = []
    if not history or history[0].sequence != expected_audit_sequence:
        reasons.append("audit_sequence_not_latest")
    elif history[0].status != "ready_for_human_review":
        reasons.append("last_audit_not_review_eligible")
    if before.status != "pending_human_review":
        reasons.append("candidate_not_pending_review")
    current = assess_staged_review_v1(registry, owner_id, candidate_id, staging_root)
    if current["review_eligible_at_check"] is not True:
        reasons.append("current_artifact_or_status_not_eligible")
    after = registry.get(owner_id, candidate_id)
    if before.revision != after.revision or before.status != after.status:
        reasons.append("registry_changed_during_freshness_check")
    # Check the latest audit once more in case a concurrent review was logged.
    latest = audit.history(owner_id, candidate_id, limit=1)
    if not latest or latest[0].sequence != expected_audit_sequence:
        reasons.append("audit_changed_during_freshness_check")
    reasons = list(dict.fromkeys(reasons))
    return {
        "contract": "future-xsus-core.review-freshness.v1",
        "candidate_id": candidate_id,
        "expected_audit_sequence": expected_audit_sequence,
        "registry_revision_at_check": after.revision,
        "status": "stale_or_blocked" if reasons else "fresh_at_check",
        "reasons": reasons,
        "review_eligible_at_check": not reasons,
        "release_authorized": False,
        "atomic_with_registry_or_audit": False,
    }
