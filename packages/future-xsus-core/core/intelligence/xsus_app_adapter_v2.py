"""Internal adapter only. Authentication and HTTP exposure belong to the service."""
from .runtime_v2 import IntelligenceRuntime
from .request_router_v2 import RouterPrincipal
from .reasoning_v1 import Rule, _atom

class XSUSAppIntelligenceAdapterV2:
    def __init__(self,runtime,*,enabled=False):
        if not isinstance(runtime,IntelligenceRuntime) or type(enabled) is not bool:
            raise ValueError("Invalid adapter configuration")
        self.runtime=runtime
        self.enabled=enabled

    def respond(self,principal,envelope):
        if not self.enabled:
            raise PermissionError("V2 adapter disabled")
        if not isinstance(principal,RouterPrincipal):
            raise PermissionError("Trusted principal required")
        if type(envelope) is not dict or set(envelope)!={"contractVersion","requestId","text","facts","rules"}:
            raise ValueError("Invalid envelope")
        if envelope["contractVersion"]!="2.0.0":
            raise ValueError("Unsupported version")
        facts,rules=envelope["facts"],envelope["rules"]
        if type(facts) is not list or type(rules) is not list or len(facts)>256 or len(rules)>256:
            raise ValueError("Invalid context")
        facts=tuple(_atom(a) for a in facts)
        parsed=[]
        for r in rules:
            if type(r) is not dict or set(r)!={"premises","conclusion"} or type(r["premises"]) is not list or not 1<=len(r["premises"])<=8:
                raise ValueError("Invalid rule")
            parsed.append(Rule(tuple(r["premises"]),r["conclusion"]))
        result=self.runtime.english(principal,envelope["requestId"],envelope["text"],facts=facts,rules=tuple(parsed))
        response=result.response
        return {"contractVersion":"2.0.0","requestId":response.request_id,
                "status":response.status,"operation":response.operation,
                "text":response.text,"memoryRevision":result.memory_revision,
                "limitations":list(response.limitations),
                "externalTruthVerified":False,"executionAuthorized":False}
