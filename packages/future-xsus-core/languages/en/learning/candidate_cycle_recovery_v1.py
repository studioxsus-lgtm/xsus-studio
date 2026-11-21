"""Explicit operator-controlled recovery of interrupted candidate training."""
from dataclasses import dataclass
from pathlib import Path
from .candidate_cycle_lock_v1 import exclusive_candidate_cycle_lock_v1
from .candidate_cycle_journal_v1 import (
    _journal_path, _read, inspect_candidate_cycle_journal_v1,
    record_candidate_cycle_state_v1,
)


@dataclass(frozen=True, slots=True)
class CandidateRecoveryRequestV1:
    report_path: Path
    expected_revision: str
    operator_acknowledged: bool = False


def inspect_candidate_cycle_recovery_v1(report_path: Path):
    """Read-only state check; no cleanup, resume, or promotion."""
    return inspect_candidate_cycle_journal_v1(report_path)


def acknowledge_interrupted_candidate_cycle_v1(request: CandidateRecoveryRequestV1):
    """Explicitly mark a leftover running run interrupted, while holding its lock.

    Artifacts remain untouched and must be reviewed independently.
    """
    if not isinstance(request,CandidateRecoveryRequestV1):
        raise ValueError("CandidateRecoveryRequestV1 required")
    if request.operator_acknowledged is not True:
        raise PermissionError("Explicit operator acknowledgement required")
    if (type(request.expected_revision) is not str
            or len(request.expected_revision)!=64
            or any(ch not in "0123456789abcdef" for ch in request.expected_revision)):
        raise ValueError("Invalid expected feedback revision")
    if not isinstance(request.report_path,Path):
        raise ValueError("Report path must be pathlib.Path")
    with exclusive_candidate_cycle_lock_v1(request.report_path):
        record=_read(_journal_path(request.report_path))
        if record is None:
            raise ValueError("No candidate cycle journal exists")
        if record["revision"]!=request.expected_revision:
            raise ValueError("Candidate cycle revision mismatch")
        if record["state"]!="running":
            raise ValueError("Only interrupted running cycles may be acknowledged")
        result=record_candidate_cycle_state_v1(
            request.report_path,request.expected_revision,"interrupted")
    return {
        "contract":"future-xsus-core.candidate-cycle-recovery.v1",
        "state":result.state,
        "requires_artifact_review":True,
        "training_resumed":False,
        "candidate_activated":False,
        "release_authorized":False,
    }
