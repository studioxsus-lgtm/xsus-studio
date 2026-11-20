"""Bounded opt-in V6 batch diagnostics with per-item isolation.

No network access, model inference, persistence or instruction execution.
"""
from dataclasses import dataclass
from .analysis_api_v6 import analyze_text_v6

@dataclass(frozen=True, slots=True)
class BatchLimits:
    max_items: int = 32
    max_total_characters: int = 50000

def analyze_batch_v6(texts: list[str] | tuple[str, ...], *, limits: BatchLimits = BatchLimits()) -> dict:
    if not isinstance(texts, (list, tuple)):
        raise ValueError("texts must be a list or tuple")
    if not isinstance(limits, BatchLimits):
        raise ValueError("limits must be BatchLimits")
    if any(not isinstance(x, int) or isinstance(x, bool) or x < 1 for x in (limits.max_items, limits.max_total_characters)):
        raise ValueError("limits must be positive integers")
    if len(texts) > limits.max_items:
        raise ValueError("batch item limit exceeded")
    if any(not isinstance(text, str) for text in texts):
        raise ValueError("each item must be a string")
    if sum(len(text) for text in texts) > limits.max_total_characters:
        raise ValueError("batch character limit exceeded")
    results = []
    for index, text in enumerate(texts):
        try:
            results.append({"index": index, "ok": True, "analysis": analyze_text_v6(text)})
        except ValueError as error:
            results.append({"index": index, "ok": False, "error": {"code": "INVALID_TEXT", "message": str(error)}})
    return {
        "contract_version": "6.0.0-experimental",
        "count": len(results),
        "succeeded": sum(item["ok"] for item in results),
        "failed": sum(not item["ok"] for item in results),
        "results": results,
    }
