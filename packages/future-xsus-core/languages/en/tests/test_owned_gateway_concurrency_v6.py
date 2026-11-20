"""Concurrent owned-gateway integration regressions without timing benchmarks."""
import unittest
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

from languages.en.integration.adapter_v6 import CONTRACT
from languages.en.integration.access_policy_v6 import DiagnosticPrincipal
from languages.en.integration.owned_replay_store_v6 import OwnedReplayStoreV6
from languages.en.integration.owned_gateway_v6 import dispatch_owned_v6


class OwnedGatewayConcurrencyV6Tests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        self.store = OwnedReplayStoreV6(max_entries=64)
        self.principal = DiagnosticPrincipal("user-1", frozenset({f"{CONTRACT}:analyze"}))

    def envelope(self, request_id="same"):
        return {"issued_at": self.now.isoformat(),
                "expires_at": (self.now + timedelta(seconds=20)).isoformat(),
                "request": {"contract": CONTRACT, "request_id": request_id,
                            "operation": "analyze", "text": "Hello."}}

    def send(self, request_id="same", principal=None):
        return dispatch_owned_v6(self.envelope(request_id), store=self.store,
                                 enabled=True, principal=principal or self.principal,
                                 remaining_budget=1, now=self.now)

    def parallel(self, count, callback):
        barrier = Barrier(count)
        def task(index):
            barrier.wait(timeout=10)
            return callback(index)
        with ThreadPoolExecutor(max_workers=count) as pool:
            return list(pool.map(task, range(count)))

    def test_duplicate_requests_have_one_success(self):
        results = self.parallel(12, lambda _: self.send())
        self.assertEqual(sum(result["ok"] for result in results), 1)
        self.assertEqual(sum(result.get("error", {}).get("code") == "REPLAY_DETECTED"
                             for result in results), 11)

    def test_unique_ids_all_succeed(self):
        results = self.parallel(12, lambda i: self.send(f"unique-{i}"))
        self.assertTrue(all(result["ok"] for result in results))

    def test_distinct_subjects_are_isolated(self):
        results = self.parallel(8, lambda i: self.send(
            principal=DiagnosticPrincipal(f"user-{i}", self.principal.scopes)))
        self.assertTrue(all(result["ok"] for result in results))

    def test_capacity_limits_concurrent_requests(self):
        self.store = OwnedReplayStoreV6(max_entries=3)
        results = self.parallel(10, lambda i: self.send(f"capacity-{i}"))
        self.assertEqual(sum(result["ok"] for result in results), 3)
        self.assertEqual(sum(result.get("error", {}).get("code") == "REPLAY_CAPACITY"
                             for result in results), 7)

    def test_parallel_invalid_requests_release_reservations(self):
        def invalid(i):
            envelope = self.envelope(f"invalid-{i}")
            envelope["request"]["text"] = ""
            try:
                dispatch_owned_v6(envelope, store=self.store, enabled=True,
                                  principal=self.principal, remaining_budget=1, now=self.now)
            except ValueError:
                return True
            return False
        self.assertTrue(all(self.parallel(8, invalid)))
        self.assertTrue(all(self.send(f"invalid-{i}")["ok"] for i in range(8)))

    def test_parallel_budget_denials_do_not_reserve(self):
        def denied(i):
            return dispatch_owned_v6(self.envelope(f"budget-{i}"), store=self.store,
                                     enabled=True, principal=self.principal,
                                     remaining_budget=0, now=self.now)
        results = self.parallel(8, denied)
        self.assertTrue(all(result["error"]["code"] == "BUDGET_EXHAUSTED"
                            for result in results))
        self.assertTrue(all(self.send(f"budget-{i}")["ok"] for i in range(8)))

    def test_parallel_exception_recovery(self):
        with patch("languages.en.integration.owned_gateway_v6.dispatch_envelope_v6",
                   side_effect=RuntimeError("temporary failure")):
            def fail(i):
                try:
                    self.send(f"failure-{i}")
                except RuntimeError:
                    return True
                return False
            self.assertTrue(all(self.parallel(8, fail)))
        self.assertTrue(all(self.send(f"failure-{i}")["ok"] for i in range(8)))
