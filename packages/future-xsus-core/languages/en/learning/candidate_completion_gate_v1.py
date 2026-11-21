"""Read-only completion gate for trained candidate artifacts.

This gate requires completed journal, expected revision and matching
artifact manifest. It never approves model quality or deployment.
"""
from dataclasses import dataclass
from pathlib import Path
from .candidate_cycle_journal_v1 import _journal_path, _read
from .candidate_artifact_inspection_v1 import CandidateArtifactInspectionRequestV1
from .candidate_artifact_manifest_v1 import verify_candidate_artifact_manifest_v1


@dataclass(frozen=True, slots=True)
class CandidateCompletionGateRequestV1:
    report_path: Path
    candidate_path: Path
    training_path: Path
    expected_feedback_revision: str
    max_bytes_per_artifact: int = 20_000_000


def verify_candidate_completion_gate_v1(request: CandidateCompletionGateRequestV1,manifest: dict):
    """Fail closed if a completed run or its artifact digests cannot be verified."""
    if not isinstance(request,CandidateCompletionGateRequestV1):
        raise ValueError("CandidateCompletionGateRequestV1 required")
    revision=request.expected_feedback_revision
    if (type(revision) is not str or len(revision)!=64
            or any(ch not in "0123456789abcdef" for ch in revision)):
        raise ValueError("Invalid expected feedback revision")
    artifact_request=CandidateArtifactInspectionRequestV1(
        request.report_path,request.candidate_path,request.training_path,
        request.max_bytes_per_artifact,
    )
    journal=_read(_journal_path(request.report_path))
    state="absent" if journal is None else journal["state"]
    revision_matches=journal is not None and journal["revision"]==revision
    verification=verify_candidate_artifact_manifest_v1(artifact_request,manifest)
    ready=(state=="completed" and revision_matches
           and verification["artifact_digests_match"])
    return {
        "contract":"future-xsus-core.candidate-completion-gate.v1",
        "journal_state":state,
        "feedback_revision_matches":revision_matches,
        "artifact_digests_match":verification["artifact_digests_match"],
        "ready_for_human_review":bool(ready),
        "requires_human_review":True,
        "model_quality_verified":False,
        "provenance_authenticated":False,
        "release_authorized":False,
        "production_deployed":False,
    }
