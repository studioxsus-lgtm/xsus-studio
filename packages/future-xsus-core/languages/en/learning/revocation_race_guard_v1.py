"""Fail-closed post-check guard against revocation during staged review.

This is an advisory check, not an atomic authorization transaction.
"""
from pathlib import Path

from .candidate_registry_v1 import SQLiteCandidateRegistryV1
from .review_audit_v1 import SQLiteReviewAuditV1
from .staged_review_gate_v1 import assess_staged_review_v1


def assess_revocation_guarded_review_v1(
    registry: SQLiteCandidateRegistryV1,
    audit: SQLiteReviewAuditV1,
    owner_id: str,
    candidate_id: str,
    staging_root: str | Path,
) -> dict:
    if not isinstance(registry, SQLiteCandidateRegistryV1):
        raise ValueError("SQLiteCandidateRegistryV1 required")
    if not isinstance(audit, SQLiteReviewAuditV1):
        raise ValueError("SQLiteReviewAuditV1 required")
    before = registry.get(owner_id, candidate_id)
    review = assess_staged_review_v1(registry, owner_id, candidate_id, staging_root)
    after = registry.get(owner_id, candidate_id)
    reasons = list(review["reasons"])
    if (before.revision, before.status) != (after.revision, after.status):
        reasons.append("registry_revision_changed_during_review")
    if after.status != "pending_human_review":
        reasons.append("candidate_revoked_at_final_check")
    if before.status != "pending_human_review":
        reasons.append("candidate_not_pending_at_start")
    reasons = list(dict.fromkeys(reasons))
    eligible = review["review_eligible_at_check"] is True and not reasons
    guarded_review = {
        "contract": "future-xsus-core.staged-review-gate.v1",
        "candidate_id": candidate_id,
        "status": "ready_for_human_review" if eligible else "blocked",
        "reasons": reasons,
        "review_eligible_at_check": eligible,
        "release_authorized": False,
        "verification_is_continuous": False,
    }
    event = audit.record(owner_id, guarded_review)
    # A revocation can still happen after this read. Fail closed if the
    # registry changed while writing the audit event.
    final = registry.get(owner_id, candidate_id)
    if final.status != "pending_human_review" or final.revision != after.revision:
        return {
            "contract": "future-xsus-core.revocation-race-guard.v1",
            "candidate_id": candidate_id,
            "status": "blocked",
            "reasons": list(dict.fromkeys(reasons + ["registry_changed_after_audit"])),
            "review_eligible_at_check": False,
            "audit_sequence": event.sequence,
            "audit_reflects_final_status": False,
            "release_authorized": False,
            "atomic_with_registry": False,
        }
    return {
        "contract": "future-xsus-core.revocation-race-guard.v1",
        "candidate_id": candidate_id,
        "status": guarded_review["status"],
        "reasons": reasons,
        "review_eligible_at_check": eligible,
        "audit_sequence": event.sequence,
        "audit_reflects_final_status": True,
        "release_authorized": False,
        "atomic_with_registry": False,
    }
