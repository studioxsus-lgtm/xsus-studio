"""Owner-token regression matrix for persistent SQLite V6 leases."""
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from languages.en.integration.sqlite_lease_store_v6 import SQLiteLeaseStoreV6


class SQLiteOwnerTokenMatrixV6Tests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.store = SQLiteLeaseStoreV6(Path(temp.name) / "leases.db")
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        self.expiry = self.now + timedelta(seconds=10)
        self.key = ("owner", "request")

    def reserve(self, now=None, expiry=None):
        return self.store.reserve(self.key, now=now or self.now,
                                  expires_at=expiry or self.expiry)

    def test_token_is_nonempty(self):
        self.assertTrue(self.reserve()[1])

    def test_duplicate_returns_no_token(self):
        self.reserve()
        self.assertEqual(self.reserve(), ("duplicate", None))

    def test_token_is_unique_after_release(self):
        _, old = self.reserve()
        self.store.release(self.key, token=old)
        _, fresh = self.reserve()
        self.assertNotEqual(old, fresh)

    def test_token_is_unique_after_expiry(self):
        _, old = self.reserve()
        _, fresh = self.reserve(now=self.expiry,
            expiry=self.expiry + timedelta(seconds=10))
        self.assertNotEqual(old, fresh)

    def test_stale_token_cannot_release_after_expiry(self):
        _, old = self.reserve()
        _, fresh = self.reserve(now=self.expiry,
            expiry=self.expiry + timedelta(seconds=10))
        self.assertFalse(self.store.release(self.key, token=old))
        self.assertTrue(self.store.release(self.key, token=fresh))

    def test_stale_token_cannot_release_after_manual_release(self):
        _, old = self.reserve()
        self.store.release(self.key, token=old)
        _, fresh = self.reserve()
        self.assertFalse(self.store.release(self.key, token=old))
        self.assertTrue(self.store.release(self.key, token=fresh))

    def test_token_does_not_release_other_request(self):
        _, token = self.reserve()
        self.store.reserve(("owner", "other"), now=self.now, expires_at=self.expiry)
        self.assertFalse(self.store.release(("owner", "other"), token=token))

    def test_token_does_not_release_other_subject(self):
        _, token = self.reserve()
        self.store.reserve(("other", "request"), now=self.now, expires_at=self.expiry)
        self.assertFalse(self.store.release(("other", "request"), token=token))

    def test_empty_token_rejected(self):
        with self.assertRaises(ValueError):
            self.store.release(self.key, token="")

    def test_none_token_rejected(self):
        with self.assertRaises(ValueError):
            self.store.release(self.key, token=None)

    def test_wrong_token_preserves_duplicate(self):
        self.reserve()
        self.assertFalse(self.store.release(self.key, token="bad"))
        self.assertEqual(self.reserve()[0], "duplicate")

    def test_owner_release_then_reserve(self):
        _, token = self.reserve()
        self.assertTrue(self.store.release(self.key, token=token))
        self.assertEqual(self.reserve()[0], "reserved")
