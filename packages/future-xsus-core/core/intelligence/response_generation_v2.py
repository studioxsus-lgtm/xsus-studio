"""Render trusted internal engine results; no independent truth certification."""
from dataclasses import dataclass
from .kernel_v2 import KernelResponse
from .reasoning_v1 import ReasoningResult, _atom
from .problem_solver_v2 import MultiGoalSolution
from .knowledge_v2 import EvidenceDerivation
from .multi_engine_v2 import CoordinationResult
from .solution_search_v2 import SearchResult

@dataclass(frozen=True, slots=True)
class GeneratedResponse:
    status: str
    text: str
    request_id: str
    operation: str
    limitations: tuple
    external_truth_verified: bool = False
    execution_authorized: bool = False

def _names(atoms):
    return ", ".join(_atom(a) for a in atoms)

def generate_response(response):
    if not isinstance(response,KernelResponse) or response.version!="2.0.0" or response.execution_authorized is not False:
        raise ValueError("Trusted V2 response required")
    op,r=response.operation,response.result
    limits=("formal_results_only","not_independent_truth_verification")
    if op=="reason" and type(r) is tuple and 1<=len(r)<=32 and all(isinstance(x,ReasoningResult) for x in r):
        lines=[]
        for x in r:
            q=_atom(x.query)
            if x.entailed and x.status=="entailed" and x.proof:
                lines.append(f"{q}: derived from supplied premises ({len(x.proof)} proof steps).")
            elif not x.entailed and x.status=="unknown":
                lines.append(f"{q}: not proven; this does not establish falsity.")
            else:
                raise ValueError("Inconsistent reasoning result")
        count=sum(x.entailed for x in r)
        status="resolved" if count==len(r) else "partial" if count else "abstained"
        body=" ".join(lines)
    elif op=="solve" and isinstance(r,MultiGoalSolution) and not r.executable:
        status={"solved":"resolved","partial":"partial","unknown":"abstained","resource_limit":"abstained"}[r.status]
        body=f"Derived goals: {_names(r.resolved) or 'none'}. Unresolved goals: {_names(r.unresolved) or 'none'}."
        if r.status=="resource_limit":
            body+=" Proof budget exceeded."
    elif op=="infer" and isinstance(r,EvidenceDerivation) and not r.external_truth_verified:
        supported=r.status=="supported" and r.verified_derivation
        status="resolved" if supported else "abstained"
        body=f"{_atom(r.query)}: "+("derived from stored assertions." if supported else "conflicting assertions require review." if r.status=="conflict" else "not proven by stored assertions.")
        if supported:
            body+=f" Evidence references: {len(r.sources)}."
    elif op=="coordinate" and isinstance(r,CoordinationResult) and not r.execution_authorized:
        status="proposed" if r.status=="proposed" else "abstained"
        body=("Proposed task order: "+_names(r.ordered_tasks)+". No tasks executed." if status=="proposed" else "No plan proposed: goals or dependencies could not be validated.")
        limits+=r.limitations
    elif op=="search" and isinstance(r,SearchResult) and not r.execution_authorized:
        status="resolved" if r.alternatives else "abstained"
        body=f"{_atom(r.query)}: {len(r.alternatives)} alternative proofs found."
        if not r.search_complete:
            body+=" Search budget limited exploration."
    elif op=="evaluate_candidate" and type(r) is dict and r.get("promotion_authorized") is False:
        status={"eligible_for_manual_review":"proposed","blocked":"abstained","insufficient_improvement":"abstained"}[r["status"]]
        body={"eligible_for_manual_review":"Candidate eligible for manual review.","blocked":"Candidate blocked by evaluation.","insufficient_improvement":"Insufficient measured improvement."}[r["status"]]
        body+=" No candidate promoted."
        limits+=("caller_supplied_evaluation_labels",)
    else:
        raise ValueError("Unsupported response")
    return GeneratedResponse(status,body+" Conclusions are limited to supplied evidence and rules.",response.request_id,op,limits)
