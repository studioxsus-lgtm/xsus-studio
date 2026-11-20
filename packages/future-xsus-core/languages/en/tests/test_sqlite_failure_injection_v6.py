"""SQLite lease fault-injection and rollback invariants; local files only."""
import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch
from languages.en.integration.sqlite_lease_store_v6 import SQLiteLeaseStoreV6


class SQLiteFailureInjectionV6Tests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.path = Path(temp.name) / "leases.db"
        self.store = SQLiteLeaseStoreV6(self.path)
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        self.expiry = self.now + timedelta(seconds=10)
        self.key = ("subject", "request")

    def reserve(self, key=None):
        return self.store.reserve(key or self.key, now=self.now, expires_at=self.expiry)

    def test_reopen_after_duplicate(self):
        self.reserve()
        self.reserve()
        self.assertEqual(SQLiteLeaseStoreV6(self.path).reserve(
            self.key, now=self.now, expires_at=self.expiry)[0], "duplicate")

    def test_reopen_after_owner_release(self):
        _, token = self.reserve()
        self.assertTrue(self.store.release(self.key, token=token))
        self.assertEqual(SQLiteLeaseStoreV6(self.path).reserve(
            self.key, now=self.now, expires_at=self.expiry)[0], "reserved")

    def test_failed_release_keeps_owner(self):
        _, token = self.reserve()
        self.assertFalse(self.store.release(self.key, token="not-the-owner"))
        self.assertTrue(SQLiteLeaseStoreV6(self.path).release(self.key, token=token))

    def test_external_transaction_rollback_does_not_create_lease(self):
        with sqlite3.connect(self.path, isolation_level=None) as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("INSERT INTO leases_v6 VALUES (?, ?, ?, ?)",
                       ("subject", "request", "temporary", 9999999999999999))
            db.execute("ROLLBACK")
        self.assertEqual(self.reserve()[0], "reserved")

    def test_external_transaction_commit_creates_duplicate(self):
        with sqlite3.connect(self.path, isolation_level=None) as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("INSERT INTO leases_v6 VALUES (?, ?, ?, ?)",
                       ("subject", "request", "committed", 9999999999999999))
            db.execute("COMMIT")
        self.assertEqual(self.reserve()[0], "duplicate")

    def test_rollback_preserves_existing_lease(self):
        _, token = self.reserve()
        with sqlite3.connect(self.path, isolation_level=None) as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("DELETE FROM leases_v6 WHERE subject=? AND request_id=?", self.key)
            db.execute("ROLLBACK")
        self.assertTrue(self.store.release(self.key, token=token))

    def test_commit_removes_existing_lease(self):
        self.reserve()
        with sqlite3.connect(self.path, isolation_level=None) as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("DELETE FROM leases_v6 WHERE subject=? AND request_id=?", self.key)
            db.execute("COMMIT")
        self.assertEqual(self.reserve()[0], "reserved")

    def test_invalid_timestamp_does_not_block_future_request(self):
        with self.assertRaises(ValueError):
            self.store.reserve(self.key, now=self.now.replace(tzinfo=None),
                               expires_at=self.expiry)
        self.assertEqual(self.reserve()[0], "reserved")

    def test_wrong_token_rejection_survives_reopen(self):
        self.reserve()
        for _ in range(3):
            reopened = SQLiteLeaseStoreV6(self.path)
            self.assertFalse(reopened.release(self.key, token="invalid"))
            self.assertEqual(reopened.reserve(self.key, now=self.now,
                                               expires_at=self.expiry)[0], "duplicate")

    def test_expired_cleanup_after_reopen(self):
        self.reserve()
        later = self.expiry + timedelta(seconds=1)
        self.assertEqual(SQLiteLeaseStoreV6(self.path).reserve(
            self.key, now=later, expires_at=later + timedelta(seconds=10))[0], "reserved")
