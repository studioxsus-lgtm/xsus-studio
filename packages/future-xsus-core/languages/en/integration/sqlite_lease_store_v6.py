"""Experimental durable local SQLite lease store. Not a distributed deployment."""
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from secrets import token_urlsafe


class SQLiteLeaseStoreV6:
    def __init__(self, path):
        self.path = str(Path(path))
        if self.path == ":memory:":
            raise ValueError("use a persistent file path")
        with self._connect() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS leases_v6 (
                subject TEXT NOT NULL, request_id TEXT NOT NULL,
                token TEXT NOT NULL, expires_us INTEGER NOT NULL,
                PRIMARY KEY(subject, request_id))""")

    def _connect(self):
        db = sqlite3.connect(self.path, timeout=10, isolation_level=None)
        db.execute("PRAGMA busy_timeout=10000")
        return db

    @staticmethod
    def _key(key):
        if not isinstance(key, tuple) or len(key) != 2 or not all(
            isinstance(x, str) and 1 <= len(x) <= 128 for x in key
        ):
            raise ValueError("invalid reservation key")

    @staticmethod
    def _micros(value):
        if not isinstance(value, datetime) or value.tzinfo is None:
            raise ValueError("timestamp must be timezone-aware")
        value = value.astimezone(timezone.utc)
        epoch = datetime(1970, 1, 1, tzinfo=timezone.utc)
        delta = value - epoch
        return (delta.days * 86400 + delta.seconds) * 1000000 + delta.microseconds

    def reserve(self, key, *, now, expires_at):
        self._key(key)
        now_us, expiry_us = self._micros(now), self._micros(expires_at)
        if expiry_us <= now_us:
            raise ValueError("expiry must follow now")
        token = token_urlsafe(32)
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            try:
                db.execute("DELETE FROM leases_v6 WHERE expires_us <= ?", (now_us,))
                cursor = db.execute(
                    "INSERT OR IGNORE INTO leases_v6 VALUES (?, ?, ?, ?)",
                    (key[0], key[1], token, expiry_us))
                status = ("reserved", token) if cursor.rowcount == 1 else ("duplicate", None)
                db.execute("COMMIT")
                return status
            except BaseException:
                db.execute("ROLLBACK")
                raise

    def release(self, key, *, token):
        self._key(key)
        if not isinstance(token, str) or not token:
            raise ValueError("invalid ownership token")
        with self._connect() as db:
            cursor = db.execute(
                "DELETE FROM leases_v6 WHERE subject=? AND request_id=? AND token=?",
                (key[0], key[1], token))
            return cursor.rowcount == 1
