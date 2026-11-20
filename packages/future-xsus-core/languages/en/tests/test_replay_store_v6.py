import unittest
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from datetime import datetime, timezone, timedelta
from languages.en.integration.replay_store_v6 import InMemoryReservationStoreV6


class ReplayStoreV6Tests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        self.expiry = self.now + timedelta(seconds=10)
        self.store = InMemoryReservationStoreV6(max_entries=2)

    def reserve(self, key=("subject", "request")):
        return self.store.reserve(key, now=self.now, expires_at=self.expiry)

    def test_first_reservation(self):
        self.assertEqual(self.reserve(), "reserved")

    def test_duplicate(self):
        self.reserve()
        self.assertEqual(self.reserve(), "duplicate")

    def test_capacity(self):
        self.assertEqual(self.reserve(("s", "a")), "reserved")
        self.assertEqual(self.reserve(("s", "b")), "reserved")
        self.assertEqual(self.reserve(("s", "c")), "capacity")

    def test_release_allows_retry(self):
        self.reserve()
        self.assertTrue(self.store.release(("subject", "request")))
        self.assertEqual(self.reserve(), "reserved")

    def test_release_missing(self):
        self.assertFalse(self.store.release(("subject", "missing")))

    def test_expired_reservation_can_be_reused(self):
        self.reserve()
        later = self.now + timedelta(seconds=11)
        result = self.store.reserve(("subject", "request"), now=later,
                                    expires_at=later + timedelta(seconds=10))
        self.assertEqual(result, "reserved")

    def test_subject_isolation(self):
        self.assertEqual(self.reserve(("a", "id")), "reserved")
        self.assertEqual(self.reserve(("b", "id")), "reserved")

    def test_invalid_keys(self):
        for key in ("x", ("", "id"), ("a",), ("a", 1), (None, "id")):
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.reserve(key)

    def test_invalid_expiry(self):
        with self.assertRaises(ValueError):
            self.store.reserve(("s", "id"), now=self.now, expires_at=self.now)

    def test_naive_datetime(self):
        with self.assertRaises(ValueError):
            self.store.reserve(("s", "id"), now=self.now.replace(tzinfo=None),
                               expires_at=self.expiry)

    def test_invalid_capacity(self):
        for value in (0, -1, True, 100001):
            with self.subTest(value=value), self.assertRaises(ValueError):
                InMemoryReservationStoreV6(max_entries=value)

    def test_atomic_duplicate_under_contention(self):
        store = InMemoryReservationStoreV6()
        barrier = Barrier(12)
        def task(_):
            barrier.wait(timeout=10)
            return store.reserve(("s", "id"), now=self.now, expires_at=self.expiry)
        with ThreadPoolExecutor(max_workers=12) as pool:
            results = list(pool.map(task, range(12)))
        self.assertEqual(results.count("reserved"), 1)
        self.assertEqual(results.count("duplicate"), 11)
