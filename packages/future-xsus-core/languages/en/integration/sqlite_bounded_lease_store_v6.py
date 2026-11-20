"""Experimental file-backed bounded lease store; no production integration."""
import sqlite3
from pathlib import Path
from secrets import token_urlsafe
from .sqlite_lease_store_v6 import SQLiteLeaseStoreV6


class SQLiteBoundedLeaseStoreV6(SQLiteLeaseStoreV6):
    """Enforce a per-database atomic maximum number of active leases.

    The configured maximum is stored in the database to prevent independent
    processes from silently using incompatible limits.
    """
    def __init__(self, path, *, max_entries=4096):
        if type(max_entries) is not int or not 1 <= max_entries <= 100000:
            raise ValueError("invalid max_entries")
        super().__init__(path)
        self.max_entries = max_entries
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            try:
                db.execute("""CREATE TABLE IF NOT EXISTS lease_config_v6 (
                    id INTEGER PRIMARY KEY CHECK(id = 1),
                    max_entries INTEGER NOT NULL CHECK(max_entries BETWEEN 1 AND 100000)
                )""")
                db.execute("INSERT OR IGNORE INTO lease_config_v6 VALUES (1, ?)",
                           (max_entries,))
                actual = db.execute("SELECT max_entries FROM lease_config_v6 WHERE id=1"
                                    ).fetchone()[0]
                if actual != max_entries:
                    raise ValueError("database capacity configuration mismatch")
                db.execute("COMMIT")
            except BaseException:
                db.execute("ROLLBACK")
                raise

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
                exists = db.execute(
                    "SELECT 1 FROM leases_v6 WHERE subject=? AND request_id=?", key
                ).fetchone()
                if exists:
                    result = ("duplicate", None)
                elif db.execute("SELECT COUNT(*) FROM leases_v6").fetchone()[0] >= self.max_entries:
                    result = ("capacity", None)
                else:
                    db.execute("INSERT INTO leases_v6 VALUES (?, ?, ?, ?)",
                               (key[0], key[1], token, expiry_us))
                    result = ("reserved", token)
                db.execute("COMMIT")
                return result
            except BaseException:
                db.execute("ROLLBACK")
                raise
