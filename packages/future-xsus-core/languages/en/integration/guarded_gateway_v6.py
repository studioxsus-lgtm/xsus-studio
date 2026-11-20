"""Explicit opt-in gateway with upstream principal authorization.

In-process request budget is per invocation only; not a distributed rate limiter.
"""
from .access_policy_v6 import authorize_diagnostics_v6
from .gateway_v6 import dispatch_v6

def dispatch_guarded_v6(request: dict, *, enabled: bool = False, principal=None, remaining_budget: int = 0) -> dict:
    if type(enabled) is not bool:
        raise ValueError("enabled must be a boolean")
    if not enabled:
        return {"contract": "future-xsus-core.v6.diagnostics", "ok": False,
                "error": {"code": "FEATURE_DISABLED", "message": "V6 diagnostics is disabled"}}
    if not isinstance(request, dict):
        raise ValueError("request must be an object")
    if not authorize_diagnostics_v6(principal, request.get("operation")):
        return {"contract": "future-xsus-core.v6.diagnostics", "ok": False,
                "error": {"code": "ACCESS_DENIED", "message": "Diagnostic access denied"}}
    if type(remaining_budget) is not int or remaining_budget < 0:
        raise ValueError("remaining_budget must be a nonnegative integer")
    if remaining_budget == 0:
        return {"contract": "future-xsus-core.v6.diagnostics", "ok": False,
                "error": {"code": "BUDGET_EXHAUSTED", "message": "Request budget exhausted"}}
    return dispatch_v6(request, enabled=True)
