"""Review-gated knowledge conflict triage without automatic fact promotion."""
from dataclasses import dataclass
from .knowledge_v1 import KnowledgeStore, KnowledgeRecord, _id
from .learning_v1 import LearningLedger, LearningProposal


@dataclass(frozen=True, slots=True)
class KnowledgeLearningResult:
    status: str
    key: str
    sources: tuple[str, ...]
    proposal: LearningProposal | None
    limitations: tuple[str, ...]


class KnowledgeLearningCoordinator:
    def __init__(self, store: KnowledgeStore, ledger: LearningLedger):
        if not isinstance(store, KnowledgeStore) or not isinstance(ledger, LearningLedger):
            raise ValueError("invalid knowledge-learning dependencies")
        self.store = store
        self.ledger = ledger

    def assess(self, owner_id: str, key: str) -> KnowledgeLearningResult:
        answer = self.store.query(owner_id, key)
        return KnowledgeLearningResult(
            answer.status, answer.key, answer.sources, None,
            ("no_automatic_knowledge_promotion", "no_external_truth_verification"))

    def propose_conflict_review(self, owner_id: str, key: str,
                                correction: str, evidence_source: str) -> KnowledgeLearningResult:
        owner_id, key, evidence_source = _id(owner_id), _id(key), _id(evidence_source)
        answer = self.store.query(owner_id, key)
        if answer.status != "conflict":
            raise ValueError("conflict review requires conflicting evidence")
        if evidence_source not in answer.sources:
            raise ValueError("proposal source must belong to conflicting evidence")
        # Deliberately store only the key/status as observation; do not
        # accidentally merge conflicting records or claim external truth.
        proposal = self.ledger.propose(
            owner_id, "conflict:" + key, correction, evidence_source)
        return KnowledgeLearningResult(
            "pending_review", key, answer.sources, proposal,
            ("human_review_required", "proposal_is_not_verified_knowledge",
             "no_automatic_knowledge_promotion"))

    def review(self, owner_id: str, proposal_id: str, *, reviewer_id: str,
               approve: bool, expected_revision: int, note: str) -> LearningProposal:
        return self.ledger.review(owner_id, proposal_id, reviewer_id=reviewer_id,
                                  approve=approve, expected_revision=expected_revision,
                                  note=note)

    def candidate_record(self, owner_id: str, proposal_id: str,
                         evidence: KnowledgeRecord) -> KnowledgeRecord:
        """Validate a candidate for external/manual review, never insert it."""
        owner_id = _id(owner_id)
        proposal = self.ledger.get(owner_id, proposal_id)
        if proposal is None or proposal.status != "approved_for_evaluation":
            raise ValueError("proposal is not approved for evaluation")
        if not isinstance(evidence, KnowledgeRecord) or evidence.owner_id != owner_id:
            raise ValueError("candidate evidence owner mismatch")
        if proposal.observation != "conflict:" + evidence.key:
            raise ValueError("candidate key mismatch")
        if proposal.correction != evidence.value:
            raise ValueError("candidate value mismatch")
        if proposal.evidence_source != evidence.evidence.source_id:
            raise ValueError("candidate source mismatch")
        return evidence
