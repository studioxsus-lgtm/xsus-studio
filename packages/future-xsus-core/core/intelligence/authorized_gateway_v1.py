"""Explicit authorization boundary for bounded intelligence operations.

The trusted service must supply the authenticated principal, never request JSON.
This adapter does not authenticate credentials or authorize external execution.
"""
from dataclasses import dataclass
from threading import BoundedSemaphore
from .knowledge_v1 import _id
from .unified_pipeline_v1 import PipelineRequest, UnifiedIntelligencePipeline

_ALLOWED = frozenset(("reason", "solve_problem", "plan_tasks", "decide"))


@dataclass(frozen=True, slots=True)
class IntelligencePrincipal:
    owner_id: str
    permissions: frozenset[str]

    def __post_init__(self):
        _id(self.owner_id)
        if not isinstance(self.permissions, frozenset) or not self.permissions <= _ALLOWED:
            raise ValueError("invalid intelligence permissions")


class AuthorizedIntelligenceGateway:
    def __init__(self, pipeline=None, *, capacity=8):
        if type(capacity) is not int or not 1 <= capacity <= 32:
            raise ValueError("invalid capacity")
        self._pipeline = pipeline if pipeline is not None else UnifiedIntelligencePipeline()
        self._slots = BoundedSemaphore(capacity)

    def run(self, principal: IntelligencePrincipal, request: PipelineRequest):
        if not isinstance(principal, IntelligencePrincipal):
            raise PermissionError("trusted principal required")
        if not isinstance(request, PipelineRequest):
            raise ValueError("invalid request")
        if request.operation not in _ALLOWED or request.operation not in principal.permissions:
            raise PermissionError("operation not permitted")
        if not self._slots.acquire(blocking=False):
            raise RuntimeError("intelligence capacity reached")
        try:
            return self._pipeline.run(request)
        finally:
            self._slots.release()
