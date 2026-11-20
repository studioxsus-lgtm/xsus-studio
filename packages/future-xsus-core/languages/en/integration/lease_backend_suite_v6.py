"""Reusable backend-neutral lease conformance checks.

Run only against isolated test stores. This is not a distributed correctness proof.
"""
from datetime import datetime, timedelta, timezone
from secrets import token_hex
from .distributed_store_contract_v6 import validate_lease_store_v6


def run_lease_backend_suite_v6(store, *, now: datetime, ttl_seconds: int = 10) -> dict:
    validate_lease_store_v6(store)
    if not isinstance(now, datetime) or now.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    if type(ttl_seconds) is not int or not 1 <= ttl_seconds <= 30:
        raise ValueError("ttl_seconds must be an integer from 1 to 30")
    now = now.astimezone(timezone.utc)
    expiry = now + timedelta(seconds=ttl_seconds)
    prefix = token_hex(16)
    first = ("v6-suite", prefix + "-a")
    second = ("v6-suite", prefix + "-b")
    checks = []
    owned = []
    try:
        status, token = store.reserve(first, now=now, expires_at=expiry)
        if status != "reserved" or not isinstance(token, str) or not token:
            raise AssertionError("initial reservation failed")
        owned.append((first, token))
        checks.append("initial_reserve")
        if store.reserve(first, now=now, expires_at=expiry) != ("duplicate", None):
            raise AssertionError("duplicate reservation was accepted")
        checks.append("duplicate_rejection")
        if store.release(first, token="invalid-owner"):
            raise AssertionError("wrong owner released reservation")
        if store.reserve(first, now=now, expires_at=expiry) != ("duplicate", None):
            raise AssertionError("wrong owner changed reservation")
        checks.append("wrong_owner_rejection")
        status2, token2 = store.reserve(second, now=now, expires_at=expiry)
        if status2 != "reserved" or not isinstance(token2, str) or not token2:
            raise AssertionError("independent key reservation failed")
        owned.append((second, token2))
        checks.append("key_isolation")
        if not store.release(first, token=token):
            raise AssertionError("owner release failed")
        owned.remove((first, token))
        checks.append("owner_release")
        status3, token3 = store.reserve(first, now=now, expires_at=expiry)
        if status3 != "reserved" or not isinstance(token3, str) or not token3:
            raise AssertionError("re-reservation failed")
        owned.append((first, token3))
        if token3 == token:
            raise AssertionError("ownership token was reused")
        if store.release(first, token=token):
            raise AssertionError("stale owner released replacement")
        checks.append("stale_owner_rejection")
        return {"ok": True, "checks": tuple(checks), "count": len(checks)}
    finally:
        for key, owner in reversed(owned):
            store.release(key, token=owner)
