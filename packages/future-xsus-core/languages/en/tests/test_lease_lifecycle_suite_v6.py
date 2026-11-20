import unittest
from datetime import datetime, timezone
from languages.en.integration.owned_replay_store_v6 import OwnedReplayStoreV6
from languages.en.integration.lease_lifecycle_suite_v6 import run_lease_lifecycle_suite_v6


class LeaseLifecycleSuiteV6Tests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)

    def test_reference_store_passes(self):
        result = run_lease_lifecycle_suite_v6(OwnedReplayStoreV6(), now=self.now)
        self.assertTrue(result["ok"])
        self.assertEqual(result["count"], 6)

    def test_repeated_runs(self):
        store = OwnedReplayStoreV6()
        for _ in range(3):
            self.assertTrue(run_lease_lifecycle_suite_v6(store, now=self.now)["ok"])

    def test_capacity_one_suffices(self):
        self.assertTrue(run_lease_lifecycle_suite_v6(
            OwnedReplayStoreV6(max_entries=1), now=self.now)["ok"])

    def test_invalid_store(self):
        with self.assertRaises(TypeError):
            run_lease_lifecycle_suite_v6(object(), now=self.now)

    def test_naive_now(self):
        with self.assertRaises(ValueError):
            run_lease_lifecycle_suite_v6(OwnedReplayStoreV6(),
                now=self.now.replace(tzinfo=None))

    def test_invalid_ttl(self):
        for value in (0, 31, True, -1, 1.5):
            with self.subTest(value=value), self.assertRaises(ValueError):
                run_lease_lifecycle_suite_v6(OwnedReplayStoreV6(),
                    now=self.now, ttl_seconds=value)

    def test_no_expiry_backend_rejected(self):
        class NeverExpires:
            def __init__(self):
                self.active = None
            def reserve(self, key, *, now, expires_at):
                if self.active is not None:
                    return ("duplicate", None)
                self.active = "token"
                return ("reserved", self.active)
            def release(self, key, *, token):
                if self.active != token:
                    return False
                self.active = None
                return True
        with self.assertRaises(AssertionError):
            run_lease_lifecycle_suite_v6(NeverExpires(), now=self.now)

    def test_stale_owner_unsafe_backend_rejected(self):
        class UnsafeRelease(OwnedReplayStoreV6):
            def release(self, key, *, token):
                with self._lock:
                    return self._entries.pop(key, None) is not None
        with self.assertRaises(AssertionError):
            run_lease_lifecycle_suite_v6(UnsafeRelease(), now=self.now)
