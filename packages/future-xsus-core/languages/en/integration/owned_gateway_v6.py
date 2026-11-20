"""Opt-in V6 dispatch with owner-token reservations; no public network route."""
from datetime import datetime, timezone
from .access_policy_v6 import authorize_diagnostics_v6
from .adapter_v6 import CONTRACT
from .transport_contract_v6 import dispatch_envelope_v6
from .owned_replay_store_v6 import OwnedReplayStoreV6


def dispatch_owned_v6(envelope, *, store: OwnedReplayStoreV6, enabled=False,
                      principal=None, remaining_budget=0, now=None):
    if type(enabled) is not bool:
        raise ValueError("enabled must be a boolean")
    if not enabled:
        return {"contract": CONTRACT, "ok": False,
                "error": {"code": "FEATURE_DISABLED", "message": "V6 diagnostics is disabled"}}
    if not isinstance(store, OwnedReplayStoreV6):
        raise ValueError("store must be an OwnedReplayStoreV6")
    if not isinstance(envelope, dict) or set(envelope) != {"request", "issued_at", "expires_at"}:
        raise ValueError("invalid envelope")
    request = envelope["request"]
    if not isinstance(request, dict):
        raise ValueError("request must be an object")
    if not authorize_diagnostics_v6(principal, request.get("operation")):
        return {"contract": CONTRACT, "ok": False,
                "error": {"code": "ACCESS_DENIED", "message": "Diagnostic access denied"}}
    if type(remaining_budget) is not int or remaining_budget < 0:
        raise ValueError("remaining_budget must be a nonnegative integer")
    if remaining_budget == 0:
        return {"contract": CONTRACT, "ok": False,
                "error": {"code": "BUDGET_EXHAUSTED", "message": "Request budget exhausted"}}
    request_id = request.get("request_id")
    if not isinstance(request_id, str) or not 1 <= len(request_id) <= 128:
        raise ValueError("invalid request_id")
    if now is None:
        now = datetime.now(timezone.utc)
    if not isinstance(now, datetime) or now.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    if not isinstance(envelope["expires_at"], str):
        raise ValueError("invalid expiry")
    try:
        expiry = datetime.fromisoformat(envelope["expires_at"].replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("invalid expiry") from exc
    if expiry.tzinfo is None:
        raise ValueError("expiry must be timezone-aware")
    # Validate envelope validity before reserving. The transport adapter
    # independently revalidates timestamps after reservation.
    if expiry <= now:
        return {"contract": CONTRACT, "ok": False,
                "error": {"code": "REQUEST_EXPIRED", "message": "Request has expired"}}
    key = (principal.subject, request_id)
    status, token = store.reserve(key, now=now, expires_at=expiry)
    if status != "reserved":
        code = "REPLAY_DETECTED" if status == "duplicate" else "REPLAY_CAPACITY"
        return {"contract": CONTRACT, "ok": False,
                "error": {"code": code, "message": "Request cannot be reserved"}}
    try:
        response = dispatch_envelope_v6(envelope, enabled=True, principal=principal,
                                        remaining_budget=remaining_budget, now=now)
    except BaseException:
        store.release(key, token=token)
        raise
    if not response.get("ok"):
        store.release(key, token=token)
    return response
