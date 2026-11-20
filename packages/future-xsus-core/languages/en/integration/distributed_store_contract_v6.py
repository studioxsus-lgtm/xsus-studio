"""Backend-neutral lease contract for future distributed replay protection.

Defines requirements, not a Redis/Postgres backend or distributed guarantee.
"""
from datetime import datetime
from typing import Protocol, runtime_checkable


@runtime_checkable
class LeaseStoreV6(Protocol):
    def reserve(self, key: tuple[str, str], *, now: datetime,
                expires_at: datetime) -> tuple[str, str | None]:
        """Atomically return ('reserved', owner_token), ('duplicate', None)
        or ('capacity', None). TTL and ownership must be backend-enforced."""
        ...

    def release(self, key: tuple[str, str], *, token: str) -> bool:
        """Atomically compare token and delete. Never unconditional delete."""
        ...


def validate_lease_store_v6(store) -> None:
    """Shape validation only; cannot prove atomicity or backend safety."""
    if not isinstance(store, LeaseStoreV6):
        raise TypeError("lease store must provide reserve and release")
    if not callable(store.reserve) or not callable(store.release):
        raise TypeError("lease store methods must be callable")


def check_lease_store_behavior_v6(store, *, now: datetime, expires_at: datetime):
    """Opt-in conformance smoke test; mutates the supplied store.

    Run only against an isolated test namespace/backend.
    """
    from secrets import token_hex
    validate_lease_store_v6(store)
    if not isinstance(now, datetime) or now.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    if not isinstance(expires_at, datetime) or expires_at.tzinfo is None or expires_at <= now:
        raise ValueError("expires_at must follow now")
    key = ("v6-conformance", token_hex(16))
    status, token = store.reserve(key, now=now, expires_at=expires_at)
    if status != "reserved" or not isinstance(token, str) or not token:
        raise AssertionError("first reservation must return ownership token")
    try:
        if store.reserve(key, now=now, expires_at=expires_at) != ("duplicate", None):
            raise AssertionError("duplicate must not issue token")
        if store.release(key, token="invalid-owner"):
            raise AssertionError("wrong owner must not release")
        if store.reserve(key, now=now, expires_at=expires_at) != ("duplicate", None):
            raise AssertionError("wrong owner must not remove reservation")
    finally:
        if not store.release(key, token=token):
            raise AssertionError("owner must be able to release reservation")
    return True
