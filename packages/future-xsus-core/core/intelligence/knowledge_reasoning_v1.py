"""Bridge provenance-aware knowledge to formal proof with explicit trust limits."""
from dataclasses import dataclass
from .knowledge_v1 import KnowledgeStore
from .reasoning_v1 import ReasoningEngine, Rule, verify_proof


@dataclass(frozen=True, slots=True)
class GroundedInference:
    status: str
    query: str
    premises: tuple[str, ...]
    sources: tuple[str, ...]
    proof: tuple[str, ...]
    verified_derivation: bool
    verified_external_truth: bool
    limitations: tuple[str, ...]


def infer_from_knowledge(store: KnowledgeStore, owner_id: str, keys: tuple[str, ...],
                         rules: tuple[Rule, ...], query: str) -> GroundedInference:
    if not isinstance(store, KnowledgeStore):
        raise ValueError("invalid knowledge store")
    if not isinstance(keys, tuple) or not 1 <= len(keys) <= 64:
        raise ValueError("requires 1 to 64 evidence keys")
    if len(set(keys)) != len(keys):
        raise ValueError("duplicate evidence keys")
    premises, sources = [], set()
    for key in keys:
        record = store.query(owner_id, key)
        if record.status != "supported":
            return GroundedInference(record.status, query, (), record.sources,
                                     (), False, False, record.limitations)
        if record.value != "true":
            return GroundedInference("abstained", query, (), record.sources,
                                     (), False, False,
                                     ("only_explicit_true_propositions_supported",))
        premises.append(key)
        sources.update(record.sources)
    engine = ReasoningEngine(tuple(premises), rules)
    result = engine.prove(query)
    if not result.entailed:
        return GroundedInference("unknown", query, tuple(premises),
                                 tuple(sorted(sources)), (), False, False,
                                 result.limitations)
    verified = verify_proof(result, engine.facts, rules)
    if not verified:
        return GroundedInference("error", query, tuple(premises),
                                 tuple(sorted(sources)), (), False, False,
                                 ("proof_verification_failed",))
    return GroundedInference("entailed", query, tuple(premises),
                             tuple(sorted(sources)),
                             tuple(step.conclusion for step in result.proof),
                             True, False,
                             ("formal_derivation_only", "sources_not_independently_verified"))
