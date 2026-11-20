import unittest
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from datetime import datetime, timezone, timedelta
from languages.en.integration.owned_replay_store_v6 import OwnedReplayStoreV6


class OwnedReplayStoreV6Tests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        self.expiry = self.now + timedelta(seconds=10)
        self.store = OwnedReplayStoreV6(max_entries=2)
        self.key = ("subject", "request")

    def reserve(self, key=None, now=None, expiry=None):
        return self.store.reserve(key or self.key, now=now or self.now,
                                  expires_at=expiry or self.expiry)

    def test_reserve_returns_opaque_token(self):
        status, token = self.reserve()
        self.assertEqual(status, "reserved")
        self.assertIsInstance(token, str)
        self.assertGreaterEqual(len(token), 32)

    def test_duplicate_has_no_token(self):
        self.reserve()
        self.assertEqual(self.reserve(), ("duplicate", None))

    def test_wrong_token_cannot_release(self):
        _, token = self.reserve()
        self.assertFalse(self.store.release(self.key, token="wrong"))
        self.assertEqual(self.reserve(), ("duplicate", None))
        self.assertTrue(self.store.release(self.key, token=token))

    def test_correct_token_releases(self):
        _, token = self.reserve()
        self.assertTrue(self.store.release(self.key, token=token))
        self.assertEqual(self.reserve()[0], "reserved")

    def test_repeated_release_fails(self):
        _, token = self.reserve()
        self.assertTrue(self.store.release(self.key, token=token))
        self.assertFalse(self.store.release(self.key, token=token))

    def test_stale_token_cannot_release_new_reservation(self):
        _, first = self.reserve()
        self.assertTrue(self.store.release(self.key, token=first))
        _, second = self.reserve()
        self.assertNotEqual(first, second)
        self.assertFalse(self.store.release(self.key, token=first))
        self.assertEqual(self.reserve(), ("duplicate", None))

    def test_capacity_does_not_issue_token(self):
        self.reserve(("s", "a"))
        self.reserve(("s", "b"))
        self.assertEqual(self.reserve(("s", "c")), ("capacity", None))

    def test_expired_entry_replaced_with_new_token(self):
        _, old_token = self.reserve()
        later = self.now + timedelta(seconds=11)
        status, new_token = self.reserve(now=later, expiry=later + timedelta(seconds=10))
        self.assertEqual(status, "reserved")
        self.assertNotEqual(old_token, new_token)
        self.assertFalse(self.store.release(self.key, token=old_token))

    def test_subject_isolation(self):
        self.assertEqual(self.reserve(("a", "id"))[0], "reserved")
        self.assertEqual(self.reserve(("b", "id"))[0], "reserved")

    def test_invalid_token(self):
        self.reserve()
        for token in ("", None, 42):
            with self.subTest(token=token), self.assertRaises(ValueError):
                self.store.release(self.key, token=token)

    def test_invalid_key(self):
        with self.assertRaises(ValueError):
            self.store.release(("only-one",), token="x")

    def test_concurrent_reservation_has_one_owner(self):
        store = OwnedReplayStoreV6()
        barrier = Barrier(10)
        def task(_):
            barrier.wait(timeout=10)
            return store.reserve(self.key, now=self.now, expires_at=self.expiry)
        with ThreadPoolExecutor(max_workers=10) as pool:
            results = list(pool.map(task, range(10)))
        self.assertEqual(sum(status == "reserved" for status, _ in results), 1)
        self.assertEqual(sum(status == "duplicate" for status, _ in results), 9)
        self.assertEqual(sum(token is not None for _, token in results), 1)
