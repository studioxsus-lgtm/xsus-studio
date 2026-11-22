"""Internal synchronous runtime; callers must authenticate principals externally."""
from dataclasses import dataclass
from threading import BoundedSemaphore
from .persistent_memory_v2 import PersistentMemory
from .knowledge_v1 import KnowledgeStore, _id
from .kernel_v2 import UnifiedIntelligenceKernel
from .request_router_v2 import RequestRouter, RouterPrincipal
from .english_intent_v2 import EnglishRequestBridge, Intent
from .response_generation_v2 import generate_response, GeneratedResponse

@dataclass(frozen=True, slots=True)
class RuntimeResult:
    response: GeneratedResponse
    memory_revision: int
    version: str = "2.0.0"

class IntelligenceRuntime:
    def __init__(self,memory,*,capacity=8):
        if not isinstance(memory,PersistentMemory):
            raise ValueError("Persistent memory required")
        if type(capacity) is not int or not 1<=capacity<=32:
            raise ValueError("Invalid capacity")
        self._memory=memory
        self._slots=BoundedSemaphore(capacity)

    def _run(self,principal,request_id,dispatch):
        if not isinstance(principal,RouterPrincipal):
            raise PermissionError("Trusted principal required")
        _id(request_id)
        if not self._slots.acquire(blocking=False):
            raise RuntimeError("Runtime capacity reached")
        try:
            snapshot=self._memory.snapshot(principal.owner_id)
            router=RequestRouter(UnifiedIntelligenceKernel(KnowledgeStore(snapshot.records)))
            result=dispatch(router)
            if isinstance(result,Intent):
                response=GeneratedResponse("abstained","Please provide a supported, unambiguous formal English command.",request_id,"unrecognized",result.limitations)
            else:
                response=generate_response(result)
            return RuntimeResult(response,snapshot.revision)
        finally:
            self._slots.release()

    def english(self,principal,request_id,text,*,facts=(),rules=()):
        return self._run(principal,request_id,lambda router:
            EnglishRequestBridge(router).route(principal,request_id,text,facts=facts,rules=rules))

    def structured(self,principal,envelope):
        if type(envelope) is not dict:
            raise ValueError("Invalid envelope")
        request=dict(envelope)
        return self._run(principal,request.get("request_id"),lambda router:
            router.route(principal,request))
