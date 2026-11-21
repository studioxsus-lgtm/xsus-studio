"""Read-only candidate lifecycle and artifact audit; never certifies a model."""
from dataclasses import dataclass
from pathlib import Path
from .candidate_cycle_journal_v1 import inspect_candidate_cycle_journal_v1
from .candidate_artifact_inspection_v1 import (
    CandidateArtifactInspectionRequestV1, inspect_candidate_artifacts_v1,
)


@dataclass(frozen=True, slots=True)
class CandidateRecoveryAuditRequestV1:
    report_path: Path
    candidate_path: Path
    training_path: Path
    max_bytes_per_artifact: int = 20_000_000


def audit_candidate_recovery_v1(request: CandidateRecoveryAuditRequestV1):
    if not isinstance(request,CandidateRecoveryAuditRequestV1):
        raise ValueError("CandidateRecoveryAuditRequestV1 required")
    artifact_request=CandidateArtifactInspectionRequestV1(
        request.report_path,request.candidate_path,request.training_path,
        request.max_bytes_per_artifact,
    )
    artifacts=inspect_candidate_artifacts_v1(artifact_request)
    journal=inspect_candidate_cycle_journal_v1(request.report_path)
    unsafe=tuple(sorted(name for name,entry in artifacts["artifacts"].items()
                        if entry["status"] in ("unsafe","oversized")))
    missing=tuple(sorted(name for name,entry in artifacts["artifacts"].items()
                         if entry["status"]=="missing"))
    incomplete=journal.state in ("running","failed","interrupted")
    return {
        "contract":"future-xsus-core.candidate-recovery-audit.v1",
        "journal_state":journal.state,
        "artifacts":artifacts["artifacts"],
        "unsafe_artifacts":unsafe,
        "missing_artifacts":missing,
        "interrupted_or_failed_cycle":incomplete,
        "all_artifacts_present":artifacts["all_present"],
        "requires_manual_review":True,
        "training_success_independently_verified":False,
        "model_quality_verified":False,
        "candidate_release_authorized":False,
        "automatic_resume_authorized":False,
        "artifact_cleanup_performed":False,
    }
