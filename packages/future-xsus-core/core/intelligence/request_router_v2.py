"""Route structured requests from authenticated service callers, not raw credentials."""
from dataclasses import dataclass
from threading import BoundedSemaphore
from .knowledge_v1 import _id
from .kernel_v2 import UnifiedIntelligenceKernel

OPERATIONS = frozenset(("reason","solve","infer","coordinate","search","evaluate_candidate"))

@dataclass(frozen=True, slots=True)
class RouterPrincipal:
    owner_id: str
    permissions: frozenset[str]
    def __post_init__(self):
        _id(self.owner_id)
        if type(self.permissions) is not frozenset or not self.permissions <= OPERATIONS:
            raise ValueError("Invalid permissions")

class RequestRouter:
    def __init__(self, kernel, *, capacity=8):
        if not isinstance(kernel, UnifiedIntelligenceKernel):
            raise ValueError("V2 kernel required")
        if type(capacity) is not int or not 1 <= capacity <= 32:
            raise ValueError("Invalid capacity")
        self._kernel = kernel
        self._slots = BoundedSemaphore(capacity)

    def route(self, principal, envelope):
        if not isinstance(principal, RouterPrincipal):
            raise PermissionError("Trusted principal required")
        if type(envelope) is not dict or set(envelope) != {"version","request_id","operation","payload"}:
            raise ValueError("Invalid envelope")
        request = dict(envelope)
        if request["version"] != "2.0.0":
            raise ValueError("Unsupported version")
        _id(request["request_id"])
        op = request["operation"]
        if type(op) is not str or op not in principal.permissions:
            raise PermissionError("Operation not permitted")
        if type(request["payload"]) is not dict:
            raise ValueError("Invalid payload")
        payload = dict(request["payload"])
        if not self._slots.acquire(blocking=False):
            raise RuntimeError("Intelligence capacity reached")
        try:
            return self._kernel.run(principal.owner_id,request["request_id"],op,payload)
        finally:
            self._slots.release()
