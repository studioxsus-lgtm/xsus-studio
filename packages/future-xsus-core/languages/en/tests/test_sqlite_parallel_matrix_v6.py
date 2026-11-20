"""Concurrent SQLite lease operations using separate connections."""
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Barrier

from languages.en.integration.sqlite_lease_store_v6 import SQLiteLeaseStoreV6


class SQLiteParallelMatrixV6Tests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "leases.db"
        self.store = SQLiteLeaseStoreV6(self.path)
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        self.expiry = self.now + timedelta(seconds=10)
        self.key = ("subject", "same")

    def parallel(self, count, callback):
        barrier = Barrier(count)
        def worker(i):
            barrier.wait(timeout=15)
            return callback(i)
        with ThreadPoolExecutor(max_workers=count) as pool:
            return list(pool.map(worker, range(count)))

    def test_same_key_single_winner(self):
        results = self.parallel(10, lambda _: SQLiteLeaseStoreV6(self.path).reserve(
            self.key, now=self.now, expires_at=self.expiry))
        self.assertEqual(sum(status == "reserved" for status, _ in results), 1)

    def test_distinct_keys_all_win(self):
        results = self.parallel(10, lambda i: SQLiteLeaseStoreV6(self.path).reserve(
            ("subject", f"id-{i}"), now=self.now, expires_at=self.expiry))
        self.assertTrue(all(status == "reserved" for status, _ in results))

    def test_distinct_subjects_same_id_all_win(self):
        results = self.parallel(10, lambda i: SQLiteLeaseStoreV6(self.path).reserve(
            (f"subject-{i}", "same"), now=self.now, expires_at=self.expiry))
        self.assertTrue(all(status == "reserved" for status, _ in results))

    def test_parallel_wrong_owner_cannot_release(self):
        _, token = self.store.reserve(self.key, now=self.now, expires_at=self.expiry)
        results = self.parallel(10, lambda i: SQLiteLeaseStoreV6(self.path).release(
            self.key, token=f"wrong-{i}"))
        self.assertFalse(any(results))
        self.assertTrue(self.store.release(self.key, token=token))

    def test_parallel_owner_release_only_one_success(self):
        _, token = self.store.reserve(self.key, now=self.now, expires_at=self.expiry)
        results = self.parallel(10, lambda _: SQLiteLeaseStoreV6(self.path).release(
            self.key, token=token))
        self.assertEqual(results.count(True), 1)

    def test_parallel_expiry_replacement_one_winner(self):
        self.store.reserve(self.key, now=self.now, expires_at=self.expiry)
        later = self.expiry + timedelta(seconds=1)
        results = self.parallel(10, lambda _: SQLiteLeaseStoreV6(self.path).reserve(
            self.key, now=later, expires_at=later + timedelta(seconds=10)))
        self.assertEqual(sum(status == "reserved" for status, _ in results), 1)

    def test_parallel_releases_different_keys(self):
        owners = {}
        for i in range(8):
            key = ("subject", f"key-{i}")
            _, token = self.store.reserve(key, now=self.now, expires_at=self.expiry)
            owners[key] = token
        results = self.parallel(8, lambda i: SQLiteLeaseStoreV6(self.path).release(
            ("subject", f"key-{i}"), token=owners[("subject", f"key-{i}")]))
        self.assertTrue(all(results))

    def test_parallel_reopen_after_reservation(self):
        self.store.reserve(self.key, now=self.now, expires_at=self.expiry)
        results = self.parallel(8, lambda _: SQLiteLeaseStoreV6(self.path).reserve(
            self.key, now=self.now, expires_at=self.expiry))
        self.assertTrue(all(status == "duplicate" for status, _ in results))
