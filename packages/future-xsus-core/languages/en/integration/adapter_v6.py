"""Pure opt-in adapter contract for future XSUS App integration.

This adapter does not expose a web endpoint or modify production routing.
"""
from ..text.analysis_api_v6 import analyze_text_v6
from ..text.batch_api_v6 import analyze_batch_v6

CONTRACT = "future-xsus-core.v6.diagnostics"
MAX_REQUEST_ID_LENGTH = 128

def handle_diagnostic_request_v6(request: dict) -> dict:
    if not isinstance(request, dict):
        raise ValueError("request must be an object")
    if set(request) - {"contract", "request_id", "operation", "text", "texts", "history"}:
        raise ValueError("unknown request fields")
    if request.get("contract") != CONTRACT:
        raise ValueError("unsupported contract")
    request_id = request.get("request_id")
    if not isinstance(request_id, str) or not 1 <= len(request_id) <= MAX_REQUEST_ID_LENGTH:
        raise ValueError("invalid request_id")
    if not all(ch.isalnum() or ch in "-_." for ch in request_id):
        raise ValueError("invalid request_id characters")
    operation = request.get("operation")
    if operation == "analyze":
        if "texts" in request:
            raise ValueError("texts is not valid for analyze")
        if "text" not in request:
            raise ValueError("text is required")
        history = request.get("history", ())
        payload = analyze_text_v6(request["text"], history)
    elif operation == "batch":
        if "text" in request or "history" in request:
            raise ValueError("text/history not valid for batch")
        if "texts" not in request:
            raise ValueError("texts is required")
        payload = analyze_batch_v6(request["texts"])
    else:
        raise ValueError("unsupported operation")
    return {
        "contract": CONTRACT,
        "request_id": request_id,
        "operation": operation,
        "ok": True,
        "payload": payload,
    }
