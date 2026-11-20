"""Capacity and data-volume characterization for SQLite V6.

SQLiteLeaseStoreV6 has no configured max_entries; these tests document
current behavior rather than claiming a bounded production quota.
"""
import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from languages.en.integration.sqlite_lease_store_v6 import SQLiteLeaseStoreV6


class SQLiteCapacityBoundaryV6Tests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.path = Path(temp.name) / "leases.db"
        self.store = SQLiteLeaseStoreV6(self.path)
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        self.expiry = self.now + timedelta(seconds=10)

    def count(self):
        with sqlite3.connect(self.path) as db:
            return db.execute("SELECT COUNT(*) FROM leases_v6").fetchone()[0]

    def test_100_independent_reservations(self):
        for i in range(100):
            self.assertEqual(self.store.reserve(("load", str(i)), now=self.now,
                expires_at=self.expiry)[0], "reserved")
        self.assertEqual(self.count(), 100)

    def test_duplicate_load_does_not_grow_rows(self):
        key = ("load", "same")
        for _ in range(100):
            self.store.reserve(key, now=self.now, expires_at=self.expiry)
        self.assertEqual(self.count(), 1)

    def test_cleanup_after_100_expired_rows(self):
        for i in range(100):
            self.store.reserve(("load", str(i)), now=self.now, expires_at=self.expiry)
        later = self.expiry + timedelta(seconds=1)
        self.store.reserve(("load", "new"), now=later,
                           expires_at=later + timedelta(seconds=10))
        self.assertEqual(self.count(), 1)

    def test_reopened_store_preserves_100_rows(self):
        for i in range(100):
            self.store.reserve(("load", str(i)), now=self.now, expires_at=self.expiry)
        self.assertEqual(SQLiteLeaseStoreV6(self.path).reserve(
            ("load", "50"), now=self.now, expires_at=self.expiry)[0], "duplicate")
        self.assertEqual(self.count(), 100)

    def test_100_owner_releases(self):
        owners = []
        for i in range(100):
            key = ("load", str(i))
            _, token = self.store.reserve(key, now=self.now, expires_at=self.expiry)
            owners.append((key, token))
        for key, token in owners:
            self.assertTrue(self.store.release(key, token=token))
        self.assertEqual(self.count(), 0)

    def test_same_request_id_different_subjects(self):
        for i in range(100):
            self.assertEqual(self.store.reserve((f"subject-{i}", "same"),
                now=self.now, expires_at=self.expiry)[0], "reserved")
        self.assertEqual(self.count(), 100)

    def test_large_valid_key(self):
        key = ("s" * 128, "r" * 128)
        self.assertEqual(self.store.reserve(key, now=self.now,
                                             expires_at=self.expiry)[0], "reserved")

    def test_key_over_limit_rejected(self):
        with self.assertRaises(ValueError):
            self.store.reserve(("s" * 129, "r"), now=self.now,
                               expires_at=self.expiry)
        self.assertEqual(self.count(), 0)

    def test_all_expired_rows_are_removed(self):
        for i in range(40):
            self.store.reserve(("load", str(i)), now=self.now, expires_at=self.expiry)
        later = self.expiry + timedelta(seconds=1)
        self.store.reserve(("other", "new"), now=later,
                           expires_at=later + timedelta(seconds=10))
        self.assertEqual(self.count(), 1)

    def test_reuse_after_expired_cleanup(self):
        for i in range(20):
            self.store.reserve(("load", str(i)), now=self.now, expires_at=self.expiry)
        later = self.expiry + timedelta(seconds=1)
        self.assertEqual(self.store.reserve(("load", "0"), now=later,
            expires_at=later + timedelta(seconds=10))[0], "reserved")
