"""Trusted internal kernel; authentication belongs to the service boundary."""
from dataclasses import dataclass
from .reasoning_v2 import MultiStepReasoner
from .problem_solver_v2 import ComplexProblemSolver
from .knowledge_v2 import EvidenceReasoner
from .multi_engine_v2 import AdvancedCoordinator
from .solution_search_v2 import search_solutions
from .adaptive_learning_v2 import evaluate_candidate
from .knowledge_v1 import KnowledgeStore, _id

@dataclass(frozen=True, slots=True)
class KernelResponse:
    request_id: str
    operation: str
    result: object
    version: str = "2.0.0"
    execution_authorized: bool = False

class UnifiedIntelligenceKernel:
    def __init__(self, store):
        if not isinstance(store, KnowledgeStore):
            raise ValueError("KnowledgeStore required")
        self._store = store

    def run(self, owner_id, request_id, operation, payload):
        _id(owner_id)
        _id(request_id)
        if type(operation) is not str or type(payload) is not dict:
            raise ValueError("Invalid request")
        schemas = {
            "reason": {"queries","facts","rules"},
            "solve": {"goals","facts","rules"},
            "infer": {"query","rules"},
            "coordinate": {"goals","rules","tasks"},
            "search": {"query","facts","rules"},
            "evaluate_candidate": {"baseline","candidate","development","holdout"},
        }
        if operation not in schemas or set(payload)!=schemas[operation]:
            raise ValueError("Unsupported operation or payload")
        p = dict(payload)
        if operation == "reason":
            result = MultiStepReasoner(p["facts"],p["rules"]).prove_many(p["queries"])
        elif operation == "solve":
            result = ComplexProblemSolver().solve(**p)
        elif operation == "infer":
            result = EvidenceReasoner(self._store).infer(owner_id,**p)
        elif operation == "coordinate":
            result = AdvancedCoordinator(self._store).propose(owner_id,**p)
        elif operation == "search":
            result = search_solutions(**p)
        else:
            result = evaluate_candidate(**p)
        return KernelResponse(request_id,operation,result)
