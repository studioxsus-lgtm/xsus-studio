"""Fail-closed, in-memory quarantine decision for English language candidates.

This policy never moves or deletes model artifacts. Callers must enforce
its decision at the artifact registry and release boundary.
"""
from dataclasses import dataclass
from .feedback_store import SQLiteFeedbackStore
from .revocation_gate_v1 import build_revocation_checked_candidate_v1


@dataclass(frozen=True, slots=True)
class CandidateQuarantineDecisionV1:
    status: str
    reasons: tuple[str, ...]
    human_review_required: bool
    release_authorized: bool
    artifact_quarantined_on_disk: bool


def decide_candidate_quarantine_v1(report: dict) -> CandidateQuarantineDecisionV1:
    """Only an explicit passing revocation report can await human review."""
    reasons = []
    if type(report) is not dict or report.get("contract") != "future-xsus-core.revocation-gate.v1":
        reasons.append("invalid_revocation_report")
    else:
        if report.get("feedback_unchanged_at_completion") is not True:
            reasons.append("feedback_integrity_not_verified")
        if report.get("candidate_snapshot_matches") is not True:
            reasons.append("candidate_snapshot_not_verified")
        if report.get("eligible_for_human_review") is not True:
            reasons.append("candidate_not_eligible")
        supplied = report.get("reasons")
        if type(supplied) is not list or any(type(item) is not str for item in supplied):
            reasons.append("invalid_reasons")
        elif supplied:
            reasons.extend(supplied)
        if report.get("automatic_promotion_authorized") is not False:
            reasons.append("automatic_promotion_flag_invalid")
        if report.get("production_activation_authorized") is not False:
            reasons.append("production_activation_flag_invalid")
    reasons = tuple(dict.fromkeys(reasons))
    return CandidateQuarantineDecisionV1(
        status="quarantined" if reasons else "pending_human_review",
        reasons=reasons,
        human_review_required=True,
        release_authorized=False,
        artifact_quarantined_on_disk=False,
    )


def assess_language_candidate_v1(
    store: SQLiteFeedbackStore, owner_id: str, *, domain: str, **training_options
) -> dict:
    """Train through the revocation gate and return an advisory decision."""
    report = build_revocation_checked_candidate_v1(
        store, owner_id, domain=domain, **training_options
    )
    decision = decide_candidate_quarantine_v1(report)
    return {
        "contract": "future-xsus-core.candidate-quarantine.v1",
        "status": decision.status,
        "reasons": list(decision.reasons),
        "human_review_required": decision.human_review_required,
        "release_authorized": decision.release_authorized,
        "artifact_quarantined_on_disk": decision.artifact_quarantined_on_disk,
        "revocation_report": report,
    }
