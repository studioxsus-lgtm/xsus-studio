import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from languages.en.integration.sqlite_lease_store_v6 import SQLiteLeaseStoreV6
from languages.en.integration.lease_backend_suite_v6 import run_lease_backend_suite_v6
from languages.en.integration.lease_lifecycle_suite_v6 import run_lease_lifecycle_suite_v6


class SQLiteLeaseStoreV6Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "leases.db"
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        self.expiry = self.now + timedelta(seconds=10)
        self.store = SQLiteLeaseStoreV6(self.path)
        self.key = ("subject", "request")

    def test_reserve(self):
        status, token = self.store.reserve(self.key, now=self.now, expires_at=self.expiry)
        self.assertEqual(status, "reserved")
        self.assertTrue(token)

    def test_duplicate(self):
        self.store.reserve(self.key, now=self.now, expires_at=self.expiry)
        self.assertEqual(self.store.reserve(self.key, now=self.now,
                                             expires_at=self.expiry), ("duplicate", None))

    def test_reopen_persists_reservation(self):
        self.store.reserve(self.key, now=self.now, expires_at=self.expiry)
        reopened = SQLiteLeaseStoreV6(self.path)
        self.assertEqual(reopened.reserve(self.key, now=self.now,
                                          expires_at=self.expiry)[0], "duplicate")

    def test_wrong_owner(self):
        _, token = self.store.reserve(self.key, now=self.now, expires_at=self.expiry)
        self.assertFalse(self.store.release(self.key, token="wrong"))
        self.assertTrue(self.store.release(self.key, token=token))

    def test_stale_owner_after_expiry(self):
        _, old = self.store.reserve(self.key, now=self.now, expires_at=self.expiry)
        later = self.expiry + timedelta(seconds=1)
        status, new = self.store.reserve(self.key, now=later,
                                         expires_at=later + timedelta(seconds=10))
        self.assertEqual(status, "reserved")
        self.assertFalse(self.store.release(self.key, token=old))
        self.assertTrue(self.store.release(self.key, token=new))

    def test_concurrent_reserve_one_winner(self):
        def attempt(_):
            return SQLiteLeaseStoreV6(self.path).reserve(
                self.key, now=self.now, expires_at=self.expiry)
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(attempt, range(8)))
        self.assertEqual(sum(status == "reserved" for status, _ in results), 1)

    def test_backend_conformance(self):
        self.assertTrue(run_lease_backend_suite_v6(self.store, now=self.now)["ok"])

    def test_lifecycle_conformance(self):
        self.assertTrue(run_lease_lifecycle_suite_v6(self.store, now=self.now)["ok"])

    def test_invalid_expiry(self):
        with self.assertRaises(ValueError):
            self.store.reserve(self.key, now=self.now, expires_at=self.now)

    def test_invalid_key(self):
        with self.assertRaises(ValueError):
            self.store.reserve(("only-one",), now=self.now, expires_at=self.expiry)
