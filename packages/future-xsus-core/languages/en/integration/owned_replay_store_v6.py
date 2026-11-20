"""Ownership-token replay reservations: in-process reference implementation.

Atomic reserve and compare-and-release. Not a distributed lease service.
"""
from datetime import datetime, timezone
from threading import Lock
from secrets import token_urlsafe


class OwnedReplayStoreV6:
    def __init__(self, *, max_entries=4096):
        if type(max_entries) is not int or not 1 <= max_entries <= 100000:
            raise ValueError("invalid max_entries")
        self._max_entries = max_entries
        self._entries = {}
        self._lock = Lock()

    @staticmethod
    def _key(key):
        if not isinstance(key, tuple) or len(key) != 2 or not all(
            isinstance(x, str) and 1 <= len(x) <= 128 for x in key
        ):
            raise ValueError("invalid reservation key")

    @staticmethod
    def _time(value, name):
        if not isinstance(value, datetime) or value.tzinfo is None:
            raise ValueError(f"{name} must be timezone-aware")
        return value.astimezone(timezone.utc)

    def reserve(self, key, *, now, expires_at):
        """Return (status, token); token is returned only for new reservations."""
        self._key(key)
        now = self._time(now, "now")
        expires_at = self._time(expires_at, "expires_at")
        if expires_at <= now:
            raise ValueError("reservation must expire in the future")
        with self._lock:
            for old_key, (_, expiry) in tuple(self._entries.items()):
                if expiry <= now:
                    del self._entries[old_key]
            if key in self._entries:
                return ("duplicate", None)
            if len(self._entries) >= self._max_entries:
                return ("capacity", None)
            token = token_urlsafe(32)
            self._entries[key] = (token, expires_at)
            return ("reserved", token)

    def release(self, key, *, token):
        """Atomically release only when the supplied token owns the key."""
        self._key(key)
        if not isinstance(token, str) or not token:
            raise ValueError("invalid ownership token")
        with self._lock:
            entry = self._entries.get(key)
            if entry is None or entry[0] != token:
                return False
            del self._entries[key]
            return True
