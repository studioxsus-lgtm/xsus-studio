"""Atomic SQLite bounded-capacity lease tests."""
import sqlite3
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path

from languages.en.integration.sqlite_bounded_lease_store_v6 import SQLiteBoundedLeaseStoreV6


class SQLiteBoundedLeaseStoreV6Tests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "bounded.db"
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        self.expiry = self.now + timedelta(seconds=10)
        self.store = SQLiteBoundedLeaseStoreV6(self.path, max_entries=2)

    def reserve(self, key, now=None, expiry=None):
        return self.store.reserve(key, now=now or self.now,
                                  expires_at=expiry or self.expiry)

    def test_two_entries_fit(self):
        self.assertEqual(self.reserve(("a", "1"))[0], "reserved")
        self.assertEqual(self.reserve(("a", "2"))[0], "reserved")

    def test_third_entry_rejected(self):
        self.reserve(("a", "1"))
        self.reserve(("a", "2"))
        self.assertEqual(self.reserve(("a", "3")), ("capacity", None))

    def test_duplicate_takes_precedence_over_capacity(self):
        self.reserve(("a", "1"))
        self.reserve(("a", "2"))
        self.assertEqual(self.reserve(("a", "1")), ("duplicate", None))

    def test_release_frees_capacity(self):
        _, token = self.reserve(("a", "1"))
        self.reserve(("a", "2"))
        self.assertTrue(self.store.release(("a", "1"), token=token))
        self.assertEqual(self.reserve(("a", "3"))[0], "reserved")

    def test_wrong_token_does_not_free_capacity(self):
        self.reserve(("a", "1"))
        self.reserve(("a", "2"))
        self.assertFalse(self.store.release(("a", "1"), token="wrong"))
        self.assertEqual(self.reserve(("a", "3"))[0], "capacity")

    def test_expiry_frees_capacity(self):
        self.reserve(("a", "1"))
        self.reserve(("a", "2"))
        later = self.expiry + timedelta(seconds=1)
        self.assertEqual(self.reserve(("a", "3"), now=later,
                         expiry=later + timedelta(seconds=10))[0], "reserved")

    def test_reopen_preserves_capacity(self):
        self.reserve(("a", "1"))
        self.reserve(("a", "2"))
        reopened = SQLiteBoundedLeaseStoreV6(self.path, max_entries=2)
        self.assertEqual(reopened.reserve(("a", "3"), now=self.now,
                                          expires_at=self.expiry)[0], "capacity")

    def test_inconsistent_capacity_rejected(self):
        with self.assertRaises(ValueError):
            SQLiteBoundedLeaseStoreV6(self.path, max_entries=3)

    def test_bad_zero_capacity_rejected(self):
        with self.assertRaises(ValueError):
            SQLiteBoundedLeaseStoreV6(self.path, max_entries=0)

    def test_bad_boolean_capacity_rejected(self):
        with self.assertRaises(ValueError):
            SQLiteBoundedLeaseStoreV6(self.path, max_entries=True)

    def test_bad_string_capacity_rejected(self):
        with self.assertRaises(ValueError):
            SQLiteBoundedLeaseStoreV6(self.path, max_entries="2")

    def test_bad_large_capacity_rejected(self):
        with self.assertRaises(ValueError):
            SQLiteBoundedLeaseStoreV6(self.path, max_entries=100001)

    def test_concurrent_writers_never_exceed_capacity(self):
        def reserve(i):
            return SQLiteBoundedLeaseStoreV6(self.path, max_entries=2).reserve(
                ("parallel", str(i)), now=self.now, expires_at=self.expiry)
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(reserve, range(8)))
        self.assertEqual(sum(s == "reserved" for s, _ in results), 2)
        self.assertEqual(sum(s == "capacity" for s, _ in results), 6)

    def test_database_contains_at_most_capacity(self):
        for i in range(10):
            self.reserve(("many", str(i)))
        with sqlite3.connect(self.path) as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM leases_v6"
                                        ).fetchone()[0], 2)

    def test_owner_release_is_single_use(self):
        _, token = self.reserve(("a", "1"))
        self.assertTrue(self.store.release(("a", "1"), token=token))
        self.assertFalse(self.store.release(("a", "1"), token=token))

    def test_capacity_one(self):
        other = SQLiteBoundedLeaseStoreV6(Path(self.temp.name) / "one.db", max_entries=1)
        self.assertEqual(other.reserve(("a", "1"), now=self.now,
                                       expires_at=self.expiry)[0], "reserved")
        self.assertEqual(other.reserve(("a", "2"), now=self.now,
                                       expires_at=self.expiry)[0], "capacity")
