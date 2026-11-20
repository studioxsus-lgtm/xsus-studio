"""Atomic reservation-store contract and bounded in-memory reference implementation.

The reference store is process-local, not shared across servers.
"""
from datetime import datetime, timezone
from threading import Lock


class InMemoryReservationStoreV6:
    def __init__(self, *, max_entries=4096):
        if type(max_entries) is not int or not 1 <= max_entries <= 100000:
            raise ValueError("invalid max_entries")
        self._max_entries = max_entries
        self._lock = Lock()
        self._entries = {}

    @staticmethod
    def _validate(key, now, expires_at):
        if not isinstance(key, tuple) or len(key) != 2 or not all(
            isinstance(part, str) and 1 <= len(part) <= 128 for part in key
        ):
            raise ValueError("invalid reservation key")
        if not isinstance(now, datetime) or now.tzinfo is None:
            raise ValueError("now must be timezone-aware")
        if not isinstance(expires_at, datetime) or expires_at.tzinfo is None:
            raise ValueError("expires_at must be timezone-aware")
        if expires_at <= now:
            raise ValueError("reservation must expire in the future")

    def reserve(self, key, *, now, expires_at):
        """Return 'reserved', 'duplicate' or 'capacity'; atomic per instance."""
        self._validate(key, now, expires_at)
        now = now.astimezone(timezone.utc)
        expires_at = expires_at.astimezone(timezone.utc)
        with self._lock:
            for old_key, old_expiry in tuple(self._entries.items()):
                if old_expiry <= now:
                    del self._entries[old_key]
            if key in self._entries:
                return "duplicate"
            if len(self._entries) >= self._max_entries:
                return "capacity"
            self._entries[key] = expires_at
            return "reserved"

    def release(self, key):
        """Remove a reservation; intended only for the owner of that reservation."""
        with self._lock:
            return self._entries.pop(key, None) is not None
