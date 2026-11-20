"""Deterministic lease expiry/recovery checks for an isolated test store.

No process kill or distributed fault injection is performed.
"""
from datetime import datetime, timedelta, timezone
from secrets import token_hex
from .distributed_store_contract_v6 import validate_lease_store_v6


def run_lease_lifecycle_suite_v6(store, *, now: datetime, ttl_seconds: int = 10) -> dict:
    validate_lease_store_v6(store)
    if not isinstance(now, datetime) or now.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    if type(ttl_seconds) is not int or not 1 <= ttl_seconds <= 30:
        raise ValueError("ttl_seconds must be an integer from 1 to 30")
    now = now.astimezone(timezone.utc)
    expiry = now + timedelta(seconds=ttl_seconds)
    later = expiry + timedelta(microseconds=1)
    later_expiry = later + timedelta(seconds=ttl_seconds)
    key = ("v6-lifecycle", token_hex(16))
    checks = []
    owned = None
    try:
        status, old = store.reserve(key, now=now, expires_at=expiry)
        if status != "reserved" or not isinstance(old, str) or not old:
            raise AssertionError("initial reservation failed")
        owned = old
        checks.append("initial_reserve")
        if store.reserve(key, now=expiry - timedelta(microseconds=1),
                         expires_at=later_expiry) != ("duplicate", None):
            raise AssertionError("reservation accepted before expiry")
        checks.append("pre_expiry_duplicate")
        status, fresh = store.reserve(key, now=expiry, expires_at=later_expiry)
        if status != "reserved" or not isinstance(fresh, str) or not fresh or fresh == old:
            raise AssertionError("expired reservation was not replaced with a new owner")
        owned = fresh
        checks.append("expiry_replacement")
        if store.release(key, token=old):
            raise AssertionError("stale owner released replacement")
        if store.reserve(key, now=later, expires_at=later_expiry) != ("duplicate", None):
            raise AssertionError("stale owner changed replacement")
        checks.append("stale_owner_isolation")
        if not store.release(key, token=fresh):
            raise AssertionError("new owner cannot release")
        owned = None
        checks.append("replacement_release")
        status, final = store.reserve(key, now=later, expires_at=later_expiry)
        if status != "reserved" or not final:
            raise AssertionError("released key cannot be reserved")
        owned = final
        checks.append("post_release_reuse")
        return {"ok": True, "checks": tuple(checks), "count": len(checks)}
    finally:
        if owned is not None:
            store.release(key, token=owned)
