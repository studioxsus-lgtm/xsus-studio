"""Transport-neutral request envelope for experimental V6 diagnostics.

Checks declared UTC expiry before dispatch. Does not interrupt running work,
authenticate identities, or implement a network transport.
"""
from datetime import datetime, timezone
from .guarded_gateway_v6 import dispatch_guarded_v6

CONTRACT = "future-xsus-core.v6.diagnostics"
MAX_TTL_SECONDS = 30

def dispatch_envelope_v6(envelope: dict, *, enabled: bool = False, principal=None,
                         remaining_budget: int = 0, now: datetime | None = None) -> dict:
    if type(enabled) is not bool:
        raise ValueError("enabled must be a boolean")
    if not enabled:
        return {"contract": CONTRACT, "ok": False,
                "error": {"code": "FEATURE_DISABLED", "message": "V6 diagnostics is disabled"}}
    if not isinstance(envelope, dict) or set(envelope) != {"request", "issued_at", "expires_at"}:
        raise ValueError("invalid envelope fields")
    request = envelope["request"]
    issued = envelope["issued_at"]
    expiry = envelope["expires_at"]
    if not isinstance(issued, str) or not isinstance(expiry, str):
        raise ValueError("timestamps must be ISO 8601 strings")
    try:
        issued_dt = datetime.fromisoformat(issued.replace("Z", "+00:00"))
        expiry_dt = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError("invalid ISO 8601 timestamp") from error
    if issued_dt.tzinfo is None or expiry_dt.tzinfo is None:
        raise ValueError("timestamps must be timezone-aware")
    if now is None:
        now = datetime.now(timezone.utc)
    if not isinstance(now, datetime) or now.tzinfo is None:
        raise ValueError("now must be a timezone-aware datetime")
    issued_dt = issued_dt.astimezone(timezone.utc)
    expiry_dt = expiry_dt.astimezone(timezone.utc)
    now = now.astimezone(timezone.utc)
    ttl = (expiry_dt - issued_dt).total_seconds()
    if not 0 < ttl <= MAX_TTL_SECONDS:
        raise ValueError("invalid envelope TTL")
    if issued_dt > now:
        return {"contract": CONTRACT, "ok": False,
                "error": {"code": "NOT_YET_VALID", "message": "Request issued in the future"}}
    if now >= expiry_dt:
        return {"contract": CONTRACT, "ok": False,
                "error": {"code": "REQUEST_EXPIRED", "message": "Request has expired"}}
    return dispatch_guarded_v6(request, enabled=True, principal=principal,
                               remaining_budget=remaining_budget)
