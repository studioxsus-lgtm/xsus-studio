"""Derive formal claims only from unambiguous owner-scoped assertions."""
from dataclasses import dataclass
from .knowledge_v1 import KnowledgeStore, _id
from .reasoning_v1 import _atom, verify_proof
from .reasoning_v2 import MultiStepReasoner

@dataclass(frozen=True, slots=True)
class EvidenceDerivation:
    status: str
    query: str
    proof: tuple
    sources: tuple
    conflicts: tuple
    verified_derivation: bool
    external_truth_verified: bool = False

class EvidenceReasoner:
    def __init__(self, store):
        if not isinstance(store, KnowledgeStore):
            raise ValueError("KnowledgeStore required")
        self.store = store

    def infer(self, owner_id, query, rules):
        _id(owner_id)
        _atom(query)
        groups = {}
        for record in self.store.records_for_owner(owner_id):
            # Only explicitly encoded formal assertions are eligible.
            _atom(record.key)
            if record.value not in ("true", "false"):
                continue
            groups.setdefault(record.key, []).append(record)
        conflicts = tuple(sorted(k for k, rows in groups.items()
                                 if len({r.value for r in rows}) > 1))
        denied = {k for k, rows in groups.items() if any(r.value == "false" for r in rows)}
        facts = tuple(sorted(k for k in groups if k not in denied))
        # Reject rules that would bypass explicit negative or conflicting evidence.
        engine = MultiStepReasoner(facts, rules)
        allowed = tuple(r for r in engine.rules if r.conclusion not in denied)
        result = MultiStepReasoner(facts, allowed).prove(query)
        if not result.entailed:
            status = "conflict" if query in conflicts else "unknown"
            return EvidenceDerivation(status,query,(),(),conflicts,False)
        if not verify_proof(result,facts,allowed):
            raise RuntimeError("Proof verification failed")
        roots = {s.conclusion for s in result.proof if s.rule_index is None}
        sources = tuple(sorted({(k,r.evidence.source_id,r.evidence.digest)
                                for k in roots for r in groups[k]}))
        # Rule references are indices into the filtered rule sequence.
        return EvidenceDerivation("supported",query,result.proof,sources,conflicts,True)
