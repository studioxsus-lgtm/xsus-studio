"""Explicit, bounded dispatch across Future XSUS intelligence engines.

No arbitrary method invocation, dynamic imports from input, external tools,
automatic learning, or unreviewed state changes.
"""
from dataclasses import dataclass
from .knowledge_v1 import _id


OPERATIONS = frozenset({
    "reason", "solve_problem", "plan_tasks", "decide", "infer_from_sources",
})


@dataclass(frozen=True, slots=True)
class PipelineRequest:
    request_id: str
    operation: str
    payload: dict

    def __post_init__(self):
        _id(self.request_id)
        if self.operation not in OPERATIONS:
            raise ValueError("unsupported pipeline operation")
        if not isinstance(self.payload, dict) or len(self.payload) > 12:
            raise ValueError("invalid pipeline payload")


@dataclass(frozen=True, slots=True)
class PipelineResponse:
    request_id: str
    operation: str
    status: str
    answer: str | None
    evidence: tuple[str, ...]
    steps: tuple[str, ...]
    verified: bool
    limitations: tuple[str, ...]


class UnifiedIntelligencePipeline:
    def __init__(self, kernel=None):
        if kernel is None:
            from .kernel_v1 import IntelligenceKernel
            kernel = IntelligenceKernel()
        self.kernel = kernel

    def run(self, request: PipelineRequest) -> PipelineResponse:
        if not isinstance(request, PipelineRequest):
            raise ValueError("invalid pipeline request")
        routes = {
            "reason": ("reason", frozenset(("query", "facts", "rules"))),
            "solve_problem": ("solve_problem", frozenset(("goal", "facts", "rules", "max_steps"))),
            "plan_tasks": ("plan_tasks", frozenset(("tasks",))),
            "decide": ("decide", frozenset(("criteria", "options"))),
            "infer_from_sources": ("infer_from_sources", frozenset(("store", "owner_id", "keys", "rules", "query"))),
        }
        method, allowed = routes[request.operation]
        required = allowed - {"max_steps"}
        if not required.issubset(request.payload) or not set(request.payload).issubset(allowed):
            raise ValueError("missing or unexpected pipeline payload fields")
        result = getattr(self.kernel, method)(**request.payload)
        if result.status not in ("resolved", "proposed", "abstained", "error"):
            raise ValueError("unsupported kernel status")
        if result.verified and result.status not in ("resolved", "proposed"):
            raise ValueError("invalid verified status")
        return PipelineResponse(
            request.request_id, request.operation, result.status, result.answer,
            tuple(result.evidence), tuple(result.steps), result.verified,
            tuple(result.limitations),
        )

    def run_batch(self, requests: tuple[PipelineRequest, ...]) -> tuple[PipelineResponse, ...]:
        if not isinstance(requests, tuple) or not 1 <= len(requests) <= 32:
            raise ValueError("batch must contain 1 to 32 requests")
        ids = [request.request_id for request in requests
               if isinstance(request, PipelineRequest)]
        if len(ids) != len(requests) or len(set(ids)) != len(ids):
            raise ValueError("invalid or duplicate request IDs")
        return tuple(self.run(request) for request in requests)
