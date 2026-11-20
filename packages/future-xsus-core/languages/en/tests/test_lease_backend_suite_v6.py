import unittest
from datetime import datetime, timezone
from languages.en.integration.owned_replay_store_v6 import OwnedReplayStoreV6
from languages.en.integration.lease_backend_suite_v6 import run_lease_backend_suite_v6


class LeaseBackendSuiteV6Tests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)

    def test_reference_store_passes(self):
        result = run_lease_backend_suite_v6(OwnedReplayStoreV6(), now=self.now)
        self.assertTrue(result["ok"])
        self.assertEqual(result["count"], 6)

    def test_repeated_runs_isolate_keys(self):
        store = OwnedReplayStoreV6()
        for _ in range(3):
            self.assertTrue(run_lease_backend_suite_v6(store, now=self.now)["ok"])

    def test_tiny_capacity_reports_failure(self):
        with self.assertRaises(AssertionError):
            run_lease_backend_suite_v6(OwnedReplayStoreV6(max_entries=1), now=self.now)

    def test_invalid_backend_rejected(self):
        with self.assertRaises(TypeError):
            run_lease_backend_suite_v6(object(), now=self.now)

    def test_naive_time_rejected(self):
        with self.assertRaises(ValueError):
            run_lease_backend_suite_v6(OwnedReplayStoreV6(),
                now=self.now.replace(tzinfo=None))

    def test_invalid_ttl_rejected(self):
        for value in (0, -1, 31, True, 1.5):
            with self.subTest(value=value), self.assertRaises(ValueError):
                run_lease_backend_suite_v6(OwnedReplayStoreV6(),
                    now=self.now, ttl_seconds=value)

    def test_wrong_owner_backend_rejected(self):
        class UnsafeStore:
            def reserve(self, key, *, now, expires_at):
                return ("reserved", "owner")
            def release(self, key, *, token):
                return True
        with self.assertRaises(AssertionError):
            run_lease_backend_suite_v6(UnsafeStore(), now=self.now)

    def test_duplicate_accepting_backend_rejected(self):
        class UnsafeStore:
            def reserve(self, key, *, now, expires_at):
                return ("reserved", "owner")
            def release(self, key, *, token):
                return token == "owner"
        with self.assertRaises(AssertionError):
            run_lease_backend_suite_v6(UnsafeStore(), now=self.now)

    def test_cleanup_after_partial_failure(self):
        store = OwnedReplayStoreV6(max_entries=1)
        with self.assertRaises(AssertionError):
            run_lease_backend_suite_v6(store, now=self.now)
        # A failed suite must release the first successful reservation.
        self.assertEqual(store.reserve(("normal", "request"), now=self.now,
            expires_at=self.now.replace(hour=13))[0], "reserved")
