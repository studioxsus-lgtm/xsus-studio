"""Versioned internal XSUS App adapter for formal reasoning.

Only trusted server code supplies the principal. No HTTP exposure here.
"""
from .authorized_gateway_v1 import AuthorizedIntelligenceGateway, IntelligencePrincipal
from .unified_pipeline_v1 import PipelineRequest
from .reasoning_v1 import Rule

CONTRACT_VERSION = "1.0.0"


class XSUSAppIntelligenceAdapter:
    def __init__(self, gateway=None):
        self.gateway = gateway if gateway is not None else AuthorizedIntelligenceGateway()

    def reason(self, principal: IntelligencePrincipal, envelope: dict) -> dict:
        if not isinstance(envelope, dict) or set(envelope) != {
            "contractVersion", "requestId", "query", "facts", "rules"
        }:
            raise ValueError("invalid request envelope")
        if envelope["contractVersion"] != CONTRACT_VERSION:
            raise ValueError("unsupported contract version")
        facts, rules = envelope["facts"], envelope["rules"]
        if not isinstance(facts, list) or not isinstance(rules, list) or len(facts) > 256 or len(rules) > 256:
            raise ValueError("invalid symbolic context")
        parsed = []
        for rule in rules:
            if (not isinstance(rule, dict) or set(rule) != {"premises", "conclusion"}
                    or not isinstance(rule["premises"], list) or len(rule["premises"]) > 8):
                raise ValueError("invalid rule")
            parsed.append(Rule(tuple(rule["premises"]), rule["conclusion"]))
        result = self.gateway.run(principal, PipelineRequest(
            envelope["requestId"], "reason", {"query": envelope["query"],
            "facts": tuple(facts), "rules": tuple(parsed)}))
        return {"contractVersion": CONTRACT_VERSION, "requestId": result.request_id,
                "status": result.status, "answer": result.answer,
                "verifiedDerivation": result.verified,
                "limitations": list(result.limitations),
                "executionAuthorized": False}
