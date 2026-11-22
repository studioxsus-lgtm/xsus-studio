"""Stage supplied assertions without granting truth or persistence authority."""
from dataclasses import dataclass
from hashlib import sha256
import json
from .knowledge_v1 import KnowledgeStore, KnowledgeRecord, _id, _text

@dataclass(frozen=True, slots=True)
class AcquisitionProposal:
    proposal_id: str
    status: str
    record: KnowledgeRecord
    existing_digests: tuple
    external_truth_verified: bool = False
    persistence_authorized: bool = False

class KnowledgeAcquisition:
    def __init__(self, store):
        if not isinstance(store, KnowledgeStore):
            raise ValueError("KnowledgeStore required")
        self._store = store

    def propose(self, owner_id, record):
        _id(owner_id)
        if not isinstance(record, KnowledgeRecord):
            raise ValueError("KnowledgeRecord required")
        if record.owner_id != owner_id:
            raise PermissionError("Owner mismatch")
        if not record.evidence.valid() or _text(record.value)!=record.value:
            raise ValueError("Invalid evidence or noncanonical value")
        rows=tuple(r for r in self._store.records_for_owner(owner_id) if r.key==record.key)
        if any(r.value!=record.value for r in rows):
            status="conflict_review_required"
        elif record in rows:
            status="duplicate"
        elif rows:
            status="additional_evidence_review_required"
        else:
            status="new_knowledge_review_required"
        snapshot=tuple(sorted((r.value,r.evidence.source_id,r.evidence.digest) for r in rows))
        data=(owner_id,record.key,record.value,record.evidence.source_id,record.evidence.digest,snapshot)
        digest=sha256(json.dumps(data,ensure_ascii=True,separators=(",",":")).encode()).hexdigest()
        return AcquisitionProposal(digest,status,record,tuple(sorted({r.evidence.digest for r in rows})))

    def verify(self, owner_id, proposal):
        if not isinstance(proposal,AcquisitionProposal):
            return False
        try:
            return proposal==self.propose(owner_id,proposal.record)
        except (ValueError,PermissionError,TypeError):
            return False

    def propose_batch(self, owner_id, records):
        _id(owner_id)
        if type(records) is not tuple or not 1<=len(records)<=64:
            raise ValueError("Invalid acquisition batch")
        proposals=tuple(self.propose(owner_id,r) for r in records)
        keys=[p.record.key for p in proposals]
        if len(set(keys))!=len(keys):
            raise ValueError("Repeated key requires separate review")
        return proposals
