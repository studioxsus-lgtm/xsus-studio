"""SQLite timestamp, UTC normalization, and lease boundary checks."""
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from languages.en.integration.sqlite_lease_store_v6 import SQLiteLeaseStoreV6


class SQLiteTimeMatrixV6Tests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.store = SQLiteLeaseStoreV6(Path(temp.name) / "leases.db")
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        self.expiry = self.now + timedelta(seconds=10)
        self.key = ("time", "id")

    def test_equal_instants_with_different_offsets_are_duplicate(self):
        self.store.reserve(self.key, now=self.now, expires_at=self.expiry)
        offset = timezone(timedelta(hours=5))
        self.assertEqual(self.store.reserve(self.key, now=self.now.astimezone(offset),
            expires_at=self.expiry.astimezone(offset))[0], "duplicate")

    def test_offset_expiry_boundary_is_equivalent(self):
        self.store.reserve(self.key, now=self.now, expires_at=self.expiry)
        offset = timezone(timedelta(hours=-4))
        self.assertEqual(self.store.reserve(self.key, now=self.expiry.astimezone(offset),
            expires_at=(self.expiry + timedelta(seconds=10)).astimezone(offset))[0],
            "reserved")

    def test_subsecond_before_expiry_duplicate(self):
        self.store.reserve(self.key, now=self.now, expires_at=self.expiry)
        self.assertEqual(self.store.reserve(self.key,
            now=self.expiry - timedelta(microseconds=1),
            expires_at=self.expiry + timedelta(seconds=1))[0], "duplicate")

    def test_exact_expiry_replaces(self):
        self.store.reserve(self.key, now=self.now, expires_at=self.expiry)
        self.assertEqual(self.store.reserve(self.key, now=self.expiry,
            expires_at=self.expiry + timedelta(seconds=1))[0], "reserved")

    def test_naive_expiry_rejected(self):
        with self.assertRaises(ValueError):
            self.store.reserve(self.key, now=self.now,
                expires_at=self.expiry.replace(tzinfo=None))

    def test_naive_now_rejected(self):
        with self.assertRaises(ValueError):
            self.store.reserve(self.key, now=self.now.replace(tzinfo=None),
                expires_at=self.expiry)

    def test_expiry_before_now_rejected(self):
        with self.assertRaises(ValueError):
            self.store.reserve(self.key, now=self.now, expires_at=self.now - timedelta(seconds=1))

    def test_utc_datetime_with_microseconds(self):
        start = self.now + timedelta(microseconds=123456)
        expiry = start + timedelta(microseconds=1)
        self.assertEqual(self.store.reserve(self.key, now=start, expires_at=expiry)[0],
                         "reserved")
        self.assertEqual(self.store.reserve(self.key, now=expiry,
            expires_at=expiry + timedelta(seconds=1))[0], "reserved")
