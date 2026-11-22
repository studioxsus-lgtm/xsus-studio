"""Explore alternative formal proofs by excluding rules; never execute plans."""
from dataclasses import dataclass
from collections import deque
from .reasoning_v1 import ProofStep, ReasoningResult, verify_proof, _atom
from .reasoning_v2 import MultiStepReasoner

@dataclass(frozen=True, slots=True)
class SearchResult:
    status: str
    query: str
    alternatives: tuple
    examined: int
    search_complete: bool
    execution_authorized: bool = False

def search_solutions(query, facts, rules, *, budget=64):
    if type(budget) is not int or not 1<=budget<=256:
        raise ValueError("Invalid search budget")
    _atom(query)
    MultiStepReasoner(facts,rules)
    queue=deque([frozenset()])
    scheduled={frozenset()}
    proofs={}
    examined=0
    truncated=False
    while queue and examined<budget:
        excluded=queue.popleft()
        indices=tuple(i for i in range(len(rules)) if i not in excluded)
        result=MultiStepReasoner(facts,tuple(rules[i] for i in indices)).prove(query)
        examined+=1
        if not result.entailed:
            continue
        proof=tuple(ProofStep(s.conclusion,s.premises,None if s.rule_index is None else indices[s.rule_index]) for s in result.proof)
        replay=ReasoningResult("entailed",query,True,proof,0,0,())
        if not verify_proof(replay,facts,rules):
            raise RuntimeError("Verification failed")
        key=tuple(sorted(s.rule_index for s in proof if s.rule_index is not None))
        proofs.setdefault(key,proof)
        for i in key:
            child=excluded|{i}
            if child not in scheduled:
                if len(scheduled)>=budget:
                    truncated=True
                    continue
                scheduled.add(child)
                queue.append(child)
    ranked=tuple(proofs[k] for k in sorted(proofs,key=lambda k:(len(proofs[k]),k)))
    return SearchResult("supported" if ranked else "unknown",query,ranked,examined,not queue and not truncated)

def verify_search(result,facts,rules,*,budget=64):
    if not isinstance(result,SearchResult) or result.execution_authorized:
        return False
    try:
        return result==search_solutions(result.query,facts,rules,budget=budget)
    except (ValueError,TypeError,RuntimeError):
        return False
