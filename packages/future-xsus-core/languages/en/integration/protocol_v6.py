"""Strict JSON protocol boundary for experimental V6 diagnostics.

No network listener. Reject duplicate keys and oversized payloads.
"""
import json
from .gateway_v6 import dispatch_v6

MAX_BYTES = 65536

def _reject_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result

def handle_json_v6(raw: str | bytes, *, enabled: bool = False) -> str:
    if not isinstance(raw, (str, bytes)):
        raise ValueError("raw request must be string or bytes")
    try:
        encoded = raw.encode("utf-8") if isinstance(raw, str) else raw
    except UnicodeError as error:
        raise ValueError("invalid UTF-8") from error
    if len(encoded) > MAX_BYTES:
        raise ValueError("request size limit exceeded")
    try:
        request = json.loads(encoded.decode("utf-8"), object_pairs_hook=_reject_duplicate_keys,
                             parse_constant=lambda value: (_ for _ in ()).throw(ValueError("nonfinite JSON number")))
    except (UnicodeError, json.JSONDecodeError) as error:
        raise ValueError("invalid JSON request") from error
    if not isinstance(request, dict):
        raise ValueError("request JSON must be an object")
    response = dispatch_v6(request, enabled=enabled)
    return json.dumps(response, ensure_ascii=False, sort_keys=True, allow_nan=False)
