import unittest
from datetime import datetime, timezone, timedelta
from languages.en.integration.distributed_store_contract_v6 import (
    LeaseStoreV6, validate_lease_store_v6, check_lease_store_behavior_v6
)
from languages.en.integration.owned_replay_store_v6 import OwnedReplayStoreV6


class DistributedStoreContractV6Tests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        self.expiry = self.now + timedelta(seconds=10)

    def test_reference_store_implements_protocol(self):
        self.assertIsInstance(OwnedReplayStoreV6(), LeaseStoreV6)

    def test_reference_store_passes_shape_validation(self):
        self.assertIsNone(validate_lease_store_v6(OwnedReplayStoreV6()))

    def test_missing_methods_rejected(self):
        with self.assertRaises(TypeError):
            validate_lease_store_v6(object())

    def test_noncallable_methods_rejected(self):
        class Invalid:
            reserve = 1
            release = 2
        with self.assertRaises(TypeError):
            validate_lease_store_v6(Invalid())

    def test_reference_store_conformance(self):
        self.assertTrue(check_lease_store_behavior_v6(
            OwnedReplayStoreV6(), now=self.now, expires_at=self.expiry))

    def test_conformance_can_run_twice(self):
        store = OwnedReplayStoreV6()
        for _ in range(2):
            self.assertTrue(check_lease_store_behavior_v6(
                store, now=self.now, expires_at=self.expiry))

    def test_invalid_now_rejected(self):
        with self.assertRaises(ValueError):
            check_lease_store_behavior_v6(OwnedReplayStoreV6(),
                now=self.now.replace(tzinfo=None), expires_at=self.expiry)

    def test_invalid_expiry_rejected(self):
        with self.assertRaises(ValueError):
            check_lease_store_behavior_v6(OwnedReplayStoreV6(),
                now=self.now, expires_at=self.now)

    def test_conformance_rejects_wrong_owner_release(self):
        class UnsafeStore:
            def reserve(self, key, *, now, expires_at):
                return ("reserved", "token")
            def release(self, key, *, token):
                return True
        with self.assertRaises(AssertionError):
            check_lease_store_behavior_v6(UnsafeStore(),
                now=self.now, expires_at=self.expiry)

    def test_conformance_rejects_duplicate_token(self):
        class UnsafeStore:
            def reserve(self, key, *, now, expires_at):
                return ("reserved", "token")
            def release(self, key, *, token):
                return token == "token"
        with self.assertRaises(AssertionError):
            check_lease_store_behavior_v6(UnsafeStore(),
                now=self.now, expires_at=self.expiry)
