"""In-memory candidate governance with explicit revision and approval gates.

Records audit decisions but never activate code or change deployed systems.
"""
from dataclasses import dataclass, replace
from threading import Lock
from .knowledge_v1 import _id, _text
from .improvement_v1 import ImprovementVerdict

MAX_RECORDS = 1024


@dataclass(frozen=True, slots=True)
class CandidateRecord:
    owner_id: str
    candidate_id: str
    proposal_id: str
    status: str
    revision: int
    verdict: str
    reviewer_id: str | None
    note: str | None


class CandidateGovernance:
    def __init__(self):
        self._records = {}
        self._lock = Lock()

    def register(self, owner_id: str, candidate_id: str,
                 verdict: ImprovementVerdict) -> CandidateRecord:
        owner_id, candidate_id = _id(owner_id), _id(candidate_id)
        if not isinstance(verdict, ImprovementVerdict):
            raise ValueError("validated improvement verdict required")
        if verdict.status != "eligible_for_manual_review" or verdict.regressions or not verdict.fixed_cases:
            raise ValueError("candidate is not eligible for review")
        with self._lock:
            key = (owner_id, candidate_id)
            if key in self._records:
                record = self._records[key]
                if record.proposal_id != verdict.proposal_id:
                    raise ValueError("candidate ID already bound to another proposal")
                return record
            if len(self._records) >= MAX_RECORDS:
                raise ValueError("governance capacity reached")
            record = CandidateRecord(owner_id, candidate_id, verdict.proposal_id,
                                     "pending_review", 0, verdict.status, None, None)
            self._records[key] = record
            return record

    def review(self, owner_id: str, candidate_id: str, *, reviewer_id: str,
               approve: bool, expected_revision: int, note: str) -> CandidateRecord:
        owner_id, candidate_id, reviewer_id, note = (
            _id(owner_id), _id(candidate_id), _id(reviewer_id), _text(note))
        if type(approve) is not bool or type(expected_revision) is not int or expected_revision < 0:
            raise ValueError("invalid review")
        with self._lock:
            key = (owner_id, candidate_id)
            record = self._records.get(key)
            if record is None:
                raise LookupError("candidate not found")
            if record.status != "pending_review":
                raise ValueError("candidate already reviewed")
            if record.revision != expected_revision:
                raise ValueError("stale candidate revision")
            updated = replace(record, status="approved_for_release_review" if approve else "rejected",
                              revision=record.revision + 1, reviewer_id=reviewer_id, note=note)
            self._records[key] = updated
            return updated

    def get(self, owner_id: str, candidate_id: str) -> CandidateRecord | None:
        with self._lock:
            return self._records.get((_id(owner_id), _id(candidate_id)))

    def list_for_owner(self, owner_id: str) -> tuple[CandidateRecord, ...]:
        owner_id = _id(owner_id)
        with self._lock:
            return tuple(record for (owner, _), record in self._records.items()
                         if owner == owner_id)
