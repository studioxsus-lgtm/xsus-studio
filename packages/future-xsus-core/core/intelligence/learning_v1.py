"""Review-gated, owner-scoped learning proposal ledger.

Proposals never change weights, execute code, or enter trusted knowledge.
"""
from dataclasses import dataclass, replace
from hashlib import sha256
from threading import Lock
from .knowledge_v1 import _id, _text

MAX_PROPOSALS = 1024


@dataclass(frozen=True, slots=True)
class LearningProposal:
    proposal_id: str
    owner_id: str
    observation: str
    correction: str
    evidence_source: str
    status: str
    revision: int
    reviewer_id: str | None = None
    review_note: str | None = None


class LearningLedger:
    def __init__(self):
        self._items: dict[tuple[str, str], LearningProposal] = {}
        self._lock = Lock()

    def propose(self, owner_id: str, observation: str, correction: str,
                evidence_source: str) -> LearningProposal:
        owner_id, observation, correction = _id(owner_id), _text(observation), _text(correction)
        evidence_source = _id(evidence_source)
        if observation == correction:
            raise ValueError("a correction must differ from its observation")
        digest = sha256(("\x00".join((owner_id, observation, correction, evidence_source))).encode()).hexdigest()
        key = owner_id, digest
        with self._lock:
            if key in self._items:
                return self._items[key]
            if len(self._items) >= MAX_PROPOSALS:
                raise ValueError("learning ledger capacity reached")
            proposal = LearningProposal(digest, owner_id, observation, correction,
                                        evidence_source, "pending", 0)
            self._items[key] = proposal
            return proposal

    def get(self, owner_id: str, proposal_id: str) -> LearningProposal | None:
        owner_id = _id(owner_id)
        if not isinstance(proposal_id, str) or len(proposal_id) != 64:
            raise ValueError("invalid proposal ID")
        with self._lock:
            return self._items.get((owner_id, proposal_id))

    def review(self, owner_id: str, proposal_id: str, *, reviewer_id: str,
               approve: bool, expected_revision: int, note: str) -> LearningProposal:
        owner_id, reviewer_id, note = _id(owner_id), _id(reviewer_id), _text(note)
        if type(approve) is not bool or type(expected_revision) is not int or expected_revision < 0:
            raise ValueError("invalid review decision")
        with self._lock:
            key = owner_id, proposal_id
            item = self._items.get(key)
            if item is None:
                raise LookupError("proposal not found in owner scope")
            if item.revision != expected_revision:
                raise ValueError("stale review revision")
            if item.status != "pending":
                raise ValueError("proposal already reviewed")
            updated = replace(item, status="approved_for_evaluation" if approve else "rejected",
                              reviewer_id=reviewer_id, review_note=note,
                              revision=item.revision + 1)
            self._items[key] = updated
            return updated

    def list_for_owner(self, owner_id: str) -> tuple[LearningProposal, ...]:
        owner_id = _id(owner_id)
        with self._lock:
            return tuple(v for (owner, _), v in self._items.items() if owner == owner_id)
