"""Crash-detectable, fail-closed candidate training journal.

The journal records lifecycle state, not a guarantee of atomic model artifacts.
"""
from dataclasses import dataclass
from pathlib import Path
import json
import os
import tempfile
import time


_STATES=frozenset(("running","completed","failed","interrupted"))


@dataclass(frozen=True, slots=True)
class CandidateCycleRecoveryV1:
    state: str
    needs_review: bool
    automatic_resume_authorized: bool = False
    production_deployment_authorized: bool = False


def _journal_path(report_path: Path) -> Path:
    if not isinstance(report_path,Path):
        raise ValueError("Report path must be pathlib.Path")
    return report_path.with_name(report_path.name+".cycle.json")


def _atomic_write(path: Path, payload: dict):
    path.parent.mkdir(parents=True,exist_ok=True)
    data=json.dumps(payload,sort_keys=True,separators=(",",":"),allow_nan=False).encode("utf-8")
    descriptor,name=tempfile.mkstemp(prefix=".xsus-cycle-",dir=path.parent)
    try:
        os.fchmod(descriptor,0o600)
        with os.fdopen(descriptor,"wb") as output:
            descriptor=-1
            output.write(data)
            output.flush()
            os.fsync(output.fileno())
        os.replace(name,path)
        directory_fd=os.open(path.parent,os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    finally:
        if descriptor!=-1:
            os.close(descriptor)
        if os.path.exists(name):
            os.unlink(name)


def _read(path: Path):
    if not path.exists():
        return None
    if path.is_symlink() or not path.is_file() or path.stat().st_size>16384:
        raise ValueError("Unsafe cycle journal")
    try:
        record=json.loads(path.read_text(encoding="utf-8"))
    except (UnicodeError,json.JSONDecodeError) as error:
        raise ValueError("Corrupt cycle journal") from error
    if (type(record) is not dict
            or set(record)!={"contract","state","revision","updated_at"}
            or record["contract"]!="future-xsus-core.candidate-cycle-journal.v1"
            or record["state"] not in _STATES
            or type(record["revision"]) is not str or len(record["revision"])!=64
            or any(c not in "0123456789abcdef" for c in record["revision"])
            or type(record["updated_at"]) not in (int,float)):
        raise ValueError("Invalid cycle journal")
    return record


def inspect_candidate_cycle_journal_v1(report_path: Path):
    """Report recovery needs without automatically resuming a training run."""
    record=_read(_journal_path(report_path))
    if record is None:
        return CandidateCycleRecoveryV1("absent",False)
    return CandidateCycleRecoveryV1(
        record["state"],record["state"] in ("running","failed","interrupted"))


def record_candidate_cycle_state_v1(report_path: Path,revision: str,state: str):
    """Must be called while the candidate cycle's exclusive lock is held."""
    if (type(revision) is not str or len(revision)!=64
            or any(c not in "0123456789abcdef" for c in revision)
            or state not in _STATES):
        raise ValueError("Invalid cycle state or feedback revision")
    path=_journal_path(report_path)
    old=_read(path)
    if old is not None and old["state"]=="running" and state=="running":
        raise RuntimeError("Previous training run requires explicit recovery")
    if old is not None and old["state"]=="running" and state=="completed":
        if old["revision"]!=revision:
            raise ValueError("Feedback revision changed during training")
    _atomic_write(path,{"contract":"future-xsus-core.candidate-cycle-journal.v1",
                        "state":state,"revision":revision,"updated_at":time.time()})
    return inspect_candidate_cycle_journal_v1(report_path)
