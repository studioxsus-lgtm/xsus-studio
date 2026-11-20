"""One-shot integrated English candidate review and cleanup report.

The workflow audits its review decision and inspects cleanup eligibility.
It neither deletes artifacts nor authorizes release.
"""
from pathlib import Path

from .candidate_registry_v1 import SQLiteCandidateRegistryV1
from .review_audit_v1 import SQLiteReviewAuditV1, assess_and_audit_staged_review_v1
from .revoked_cleanup_plan_v1 import plan_revoked_candidate_cleanup_v1


def build_integrated_review_report_v1(
    registry: SQLiteCandidateRegistryV1,
    audit: SQLiteReviewAuditV1,
    owner_id: str,
    candidate_id: str,
    staging_root: str | Path,
) -> dict:
    """Persist the review audit before constructing the cleanup plan."""
    audited = assess_and_audit_staged_review_v1(
        registry, audit, owner_id, candidate_id, staging_root
    )
    plan = plan_revoked_candidate_cleanup_v1(
        registry, owner_id, candidate_id, staging_root
    )
    review = audited["review"]
    reasons = list(review["reasons"])
    if plan.action == "blocked":
        reasons.append("cleanup_path_unsafe")
    return {
        "contract": "future-xsus-core.integrated-review-report.v1",
        "candidate_id": candidate_id,
        "review_status": review["status"],
        "review_eligible_at_check": (
            review["review_eligible_at_check"] is True and plan.action != "blocked"
        ),
        "review_reasons": list(dict.fromkeys(reasons)),
        "audit_recorded": audited["audit_recorded"],
        "audit_sequence": audited["audit_sequence"],
        "cleanup_action": plan.action,
        "cleanup_reasons": list(plan.reasons),
        "cleanup_dry_run": plan.dry_run,
        "deletion_authorized": False,
        "release_authorized": False,
        "verification_is_continuous": False,
    }
