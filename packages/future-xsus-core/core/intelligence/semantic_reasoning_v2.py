"""Declared concept implications, not learned semantic similarity or external truth."""
from dataclasses import dataclass
from .reasoning_v1 import Rule, _atom, MAX_RULES
from .reasoning_v2 import MultiStepReasoner

@dataclass(frozen=True, slots=True)
class ConceptRelation:
    source: str
    target: str
    kind: str
    def __post_init__(self):
        _atom(self.source)
        _atom(self.target)
        if self.source == self.target or self.kind not in ("equivalent","subtype"):
            raise ValueError("Invalid concept relation")

@dataclass(frozen=True, slots=True)
class SemanticResult:
    results: tuple
    compiled_rules: tuple
    relation_indices: tuple
    external_truth_verified: bool = False

class SemanticReasoner:
    def __init__(self, relations):
        if type(relations) is not tuple or len(relations)>MAX_RULES:
            raise ValueError("Invalid relations")
        if any(not isinstance(r,ConceptRelation) for r in relations):
            raise ValueError("Invalid relation")
        if len(set(relations))!=len(relations):
            raise ValueError("Duplicate relation")
        rules=[]
        indices=[]
        for i,r in enumerate(relations):
            rules.append(Rule((r.source,),r.target))
            indices.append(i)
            if r.kind=="equivalent":
                rules.append(Rule((r.target,),r.source))
                indices.append(i)
        if len(rules)>MAX_RULES:
            raise ValueError("Compiled rule budget exceeded")
        self.rules=tuple(rules)
        self.indices=tuple(indices)

    def infer(self, facts, queries):
        results=MultiStepReasoner(facts,self.rules).prove_many(queries)
        return SemanticResult(results,self.rules,self.indices)

    def verify(self, result, facts, queries):
        if not isinstance(result,SemanticResult) or result.external_truth_verified:
            return False
        try:
            return result==self.infer(facts,queries)
        except (ValueError,TypeError,RuntimeError):
            return False
