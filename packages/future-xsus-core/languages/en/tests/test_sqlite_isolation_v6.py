"""SQLite V6 input and ownership isolation regressions."""
import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from languages.en.integration.sqlite_lease_store_v6 import SQLiteLeaseStoreV6


class SQLiteIsolationV6Tests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.path = Path(temp.name) / "leases.db"
        self.store = SQLiteLeaseStoreV6(self.path)
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        self.expiry = self.now + timedelta(seconds=10)

    def test_subjects_with_same_request_id_are_independent(self):
        a = self.store.reserve(("alice", "same"), now=self.now, expires_at=self.expiry)
        b = self.store.reserve(("bob", "same"), now=self.now, expires_at=self.expiry)
        self.assertEqual((a[0], b[0]), ("reserved", "reserved"))

    def test_request_ids_with_same_subject_are_independent(self):
        a = self.store.reserve(("alice", "one"), now=self.now, expires_at=self.expiry)
        b = self.store.reserve(("alice", "two"), now=self.now, expires_at=self.expiry)
        self.assertEqual((a[0], b[0]), ("reserved", "reserved"))

    def test_wrong_subject_cannot_release(self):
        _, token = self.store.reserve(("alice", "one"), now=self.now, expires_at=self.expiry)
        self.assertFalse(self.store.release(("bob", "one"), token=token))
        self.assertTrue(self.store.release(("alice", "one"), token=token))

    def test_sql_metacharacters_are_data(self):
        key = ("alice'; DROP TABLE leases_v6;--", "request")
        self.assertEqual(self.store.reserve(key, now=self.now, expires_at=self.expiry)[0],
                         "reserved")
        self.assertEqual(self.store.reserve(("safe", "request"), now=self.now,
                                             expires_at=self.expiry)[0], "reserved")

    def test_empty_key_rejected(self):
        with self.assertRaises(ValueError):
            self.store.reserve(("", "id"), now=self.now, expires_at=self.expiry)

    def test_oversized_key_rejected(self):
        with self.assertRaises(ValueError):
            self.store.reserve(("x" * 129, "id"), now=self.now, expires_at=self.expiry)

    def test_naive_timestamp_rejected(self):
        with self.assertRaises(ValueError):
            self.store.reserve(("a", "b"), now=self.now.replace(tzinfo=None),
                               expires_at=self.expiry)

    def test_expiry_boundary(self):
        key = ("a", "b")
        self.store.reserve(key, now=self.now, expires_at=self.expiry)
        self.assertEqual(self.store.reserve(key, now=self.expiry,
                         expires_at=self.expiry + timedelta(seconds=10))[0], "reserved")

    def test_old_owner_cannot_release_new_lease(self):
        key = ("a", "b")
        _, old = self.store.reserve(key, now=self.now, expires_at=self.expiry)
        _, fresh = self.store.reserve(key, now=self.expiry,
                                      expires_at=self.expiry + timedelta(seconds=10))
        self.assertFalse(self.store.release(key, token=old))
        self.assertTrue(self.store.release(key, token=fresh))

    def test_reopen_after_wrong_token_still_duplicate(self):
        key = ("a", "b")
        self.store.reserve(key, now=self.now, expires_at=self.expiry)
        self.assertFalse(self.store.release(key, token="incorrect"))
        self.assertEqual(SQLiteLeaseStoreV6(self.path).reserve(
            key, now=self.now, expires_at=self.expiry)[0], "duplicate")
