"""Bounded in-process replay guard for the experimental V6 transport.

Single-process and in-memory only; not distributed replay protection.
"""
from threading import Lock
from datetime import datetime, timezone
from .transport_contract_v6 import dispatch_envelope_v6

class ReplayGuardV6:
    def __init__(self, *, max_entries: int = 4096):
        if type(max_entries) is not int or not 1 <= max_entries <= 100000:
            raise ValueError("max_entries must be an integer from 1 to 100000")
        self._max_entries = max_entries
        self._entries = {}
        self._lock = Lock()

    def dispatch(self, envelope: dict, *, enabled: bool = False, principal=None,
                 remaining_budget: int = 0, now: datetime | None = None) -> dict:
        if type(enabled) is not bool:
            raise ValueError("enabled must be a boolean")
        if not enabled:
            return {"contract": "future-xsus-core.v6.diagnostics", "ok": False,
                    "error": {"code": "FEATURE_DISABLED", "message": "V6 diagnostics is disabled"}}
        if not isinstance(envelope, dict) or not isinstance(envelope.get("request"), dict):
            raise ValueError("invalid envelope")
        request_id = envelope["request"].get("request_id")
        if not isinstance(request_id, str) or not 1 <= len(request_id) <= 128:
            raise ValueError("invalid request_id")
        if now is None:
            now = datetime.now(timezone.utc)
        if not isinstance(now, datetime) or now.tzinfo is None:
            raise ValueError("now must be timezone-aware")
        # The trusted principal must be upstream-verified; never use untrusted
        # request fields as identity.
        subject = getattr(principal, "subject", None)
        if not isinstance(subject, str) or not subject:
            return dispatch_envelope_v6(envelope, enabled=True, principal=principal,
                                        remaining_budget=remaining_budget, now=now)
        key = (subject, request_id)
        with self._lock:
            expired = [key for key, expiry in self._entries.items() if expiry <= now]
            for old_key in expired:
                del self._entries[old_key]
            if key in self._entries:
                return {"contract": "future-xsus-core.v6.diagnostics", "ok": False,
                        "error": {"code": "REPLAY_DETECTED", "message": "Duplicate request"}}
            if len(self._entries) >= self._max_entries:
                return {"contract": "future-xsus-core.v6.diagnostics", "ok": False,
                        "error": {"code": "REPLAY_CAPACITY", "message": "Replay guard at capacity"}}
            # Reservation prevents simultaneous duplicate dispatches in this process.
            self._entries[key] = now
            try:
                response = dispatch_envelope_v6(envelope, enabled=True, principal=principal,
                                                remaining_budget=remaining_budget, now=now)
            except Exception:
                del self._entries[key]
                raise
            if not response.get("ok"):
                del self._entries[key]
                return response
            expiry = datetime.fromisoformat(envelope["expires_at"].replace("Z", "+00:00"))
            self._entries[key] = expiry.astimezone(timezone.utc)
            return response
