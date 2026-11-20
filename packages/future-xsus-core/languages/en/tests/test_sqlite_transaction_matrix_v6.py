"""Expanded SQLite transactional invariants for local experimental V6 leases."""
import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from languages.en.integration.sqlite_lease_store_v6 import SQLiteLeaseStoreV6


class SQLiteTransactionMatrixV6Tests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "leases.db"
        self.store = SQLiteLeaseStoreV6(self.path)
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        self.expiry = self.now + timedelta(seconds=10)
        self.key = ("owner", "request")

    def reserve(self, key=None, now=None, expiry=None):
        return self.store.reserve(key or self.key, now=now or self.now,
                                  expires_at=expiry or self.expiry)

    def count(self):
        with sqlite3.connect(self.path) as db:
            return db.execute("SELECT COUNT(*) FROM leases_v6").fetchone()[0]

    def test_duplicate_does_not_add_row(self):
        self.reserve()
        self.reserve()
        self.assertEqual(self.count(), 1)

    def test_failed_expiry_validation_does_not_write(self):
        with self.assertRaises(ValueError):
            self.reserve(expiry=self.now)
        self.assertEqual(self.count(), 0)

    def test_failed_key_validation_does_not_write(self):
        with self.assertRaises(ValueError):
            self.reserve(key=("", "bad"))
        self.assertEqual(self.count(), 0)

    def test_wrong_token_does_not_delete_row(self):
        self.reserve()
        self.assertFalse(self.store.release(self.key, token="wrong"))
        self.assertEqual(self.count(), 1)

    def test_owner_release_deletes_one_row(self):
        _, token = self.reserve()
        self.assertTrue(self.store.release(self.key, token=token))
        self.assertEqual(self.count(), 0)

    def test_release_is_idempotent_for_missing_key(self):
        _, token = self.reserve()
        self.assertTrue(self.store.release(self.key, token=token))
        self.assertFalse(self.store.release(self.key, token=token))

    def test_separate_keys_survive_other_release(self):
        _, token = self.reserve()
        self.reserve(key=("owner", "other"))
        self.store.release(self.key, token=token)
        self.assertEqual(self.count(), 1)

    def test_expiry_cleanup_removes_old_rows(self):
        self.reserve()
        later = self.expiry + timedelta(seconds=1)
        self.reserve(key=("other", "new"), now=later,
                     expiry=later + timedelta(seconds=10))
        self.assertEqual(self.count(), 1)

    def test_duplicate_before_expiry_does_not_extend_ttl(self):
        self.reserve()
        self.reserve(expiry=self.expiry + timedelta(seconds=20))
        later = self.expiry + timedelta(seconds=1)
        self.assertEqual(self.reserve(now=later,
                         expiry=later + timedelta(seconds=10))[0], "reserved")

    def test_new_token_after_release(self):
        _, old = self.reserve()
        self.store.release(self.key, token=old)
        _, new = self.reserve()
        self.assertNotEqual(old, new)

    def test_database_reopens_after_invalid_request(self):
        with self.assertRaises(ValueError):
            self.reserve(expiry=self.now)
        self.assertEqual(SQLiteLeaseStoreV6(self.path).reserve(
            self.key, now=self.now, expires_at=self.expiry)[0], "reserved")

    def test_microsecond_boundary(self):
        expiry = self.now + timedelta(microseconds=1)
        self.reserve(expiry=expiry)
        self.assertEqual(self.reserve(now=expiry,
                         expiry=expiry + timedelta(seconds=1))[0], "reserved")
