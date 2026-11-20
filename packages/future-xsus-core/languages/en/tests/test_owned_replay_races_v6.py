"""Deterministic ownership and expiry race regressions for the V6 reference store."""
import unittest
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from datetime import datetime, timezone, timedelta

from languages.en.integration.owned_replay_store_v6 import OwnedReplayStoreV6


class OwnedReplayRacesV6Tests(unittest.TestCase):
    def setUp(self):
        self.store = OwnedReplayStoreV6(max_entries=4)
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        self.key = ("subject", "request")
        self.expiry = self.now + timedelta(seconds=10)

    def reserve(self, *, now=None, expiry=None):
        return self.store.reserve(self.key, now=now or self.now,
                                  expires_at=expiry or self.expiry)

    def test_stale_owner_cannot_release_replacement_after_expiry(self):
        _, old_token = self.reserve()
        later = self.now + timedelta(seconds=11)
        status, new_token = self.reserve(now=later, expiry=later + timedelta(seconds=10))
        self.assertEqual(status, "reserved")
        self.assertFalse(self.store.release(self.key, token=old_token))
        self.assertTrue(self.store.release(self.key, token=new_token))

    def test_exact_expiry_boundary_allows_replacement(self):
        _, old_token = self.reserve()
        status, new_token = self.reserve(now=self.expiry,
                                         expiry=self.expiry + timedelta(seconds=10))
        self.assertEqual(status, "reserved")
        self.assertNotEqual(old_token, new_token)

    def test_before_expiry_is_duplicate(self):
        self.reserve()
        self.assertEqual(self.reserve(now=self.expiry - timedelta(microseconds=1))[0],
                         "duplicate")

    def test_expiry_replacement_survives_concurrent_stale_release(self):
        _, old_token = self.reserve()
        later = self.now + timedelta(seconds=11)
        _, new_token = self.reserve(now=later, expiry=later + timedelta(seconds=10))
        barrier = Barrier(10)
        def attempt(_):
            barrier.wait(timeout=10)
            return self.store.release(self.key, token=old_token)
        with ThreadPoolExecutor(max_workers=10) as pool:
            outcomes = list(pool.map(attempt, range(10)))
        self.assertEqual(outcomes, [False] * 10)
        self.assertTrue(self.store.release(self.key, token=new_token))

    def test_concurrent_correct_release_only_one_wins(self):
        _, token = self.reserve()
        barrier = Barrier(10)
        def attempt(_):
            barrier.wait(timeout=10)
            return self.store.release(self.key, token=token)
        with ThreadPoolExecutor(max_workers=10) as pool:
            outcomes = list(pool.map(attempt, range(10)))
        self.assertEqual(outcomes.count(True), 1)
        self.assertEqual(outcomes.count(False), 9)

    def test_old_token_cannot_release_after_explicit_replacement(self):
        _, old_token = self.reserve()
        self.assertTrue(self.store.release(self.key, token=old_token))
        _, new_token = self.reserve()
        self.assertFalse(self.store.release(self.key, token=old_token))
        self.assertTrue(self.store.release(self.key, token=new_token))

    def test_concurrent_expired_replacement_one_owner(self):
        self.reserve()
        later = self.now + timedelta(seconds=11)
        barrier = Barrier(12)
        def attempt(_):
            barrier.wait(timeout=10)
            return self.reserve(now=later, expiry=later + timedelta(seconds=10))
        with ThreadPoolExecutor(max_workers=12) as pool:
            outcomes = list(pool.map(attempt, range(12)))
        self.assertEqual(sum(status == "reserved" for status, _ in outcomes), 1)
        self.assertEqual(sum(status == "duplicate" for status, _ in outcomes), 11)
        self.assertEqual(sum(token is not None for _, token in outcomes), 1)

    def test_expiry_cleanup_restores_capacity(self):
        store = OwnedReplayStoreV6(max_entries=1)
        self.assertEqual(store.reserve(("a", "one"), now=self.now,
                                       expires_at=self.expiry)[0], "reserved")
        later = self.now + timedelta(seconds=11)
        self.assertEqual(store.reserve(("b", "two"), now=later,
                                       expires_at=later + timedelta(seconds=10))[0],
                         "reserved")

    def test_cross_subject_token_cannot_release(self):
        _, token = self.reserve()
        self.assertFalse(self.store.release(("other", "request"), token=token))
        self.assertEqual(self.reserve()[0], "duplicate")
