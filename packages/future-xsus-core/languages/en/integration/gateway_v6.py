"""Explicitly disabled-by-default V6 diagnostic gateway.

Pure Python boundary; does not expose HTTP or change XSUS App routing.
"""
from .adapter_v6 import handle_diagnostic_request_v6

def dispatch_v6(request: dict, *, enabled: bool = False) -> dict:
    if type(enabled) is not bool:
        raise ValueError("enabled must be a boolean")
    if not enabled:
        return {
            "contract": "future-xsus-core.v6.diagnostics",
            "ok": False,
            "error": {"code": "FEATURE_DISABLED", "message": "V6 diagnostics is disabled"},
        }
    return handle_diagnostic_request_v6(request)
