"""Threaded replay regressions; no fragile wall-clock performance thresholds."""
import unittest
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from datetime import datetime, timezone, timedelta

from languages.en.integration.adapter_v6 import CONTRACT
from languages.en.integration.access_policy_v6 import DiagnosticPrincipal
from languages.en.integration.replay_guard_v6 import ReplayGuardV6


class ReplayConcurrencyV6Tests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc)
        self.principal = DiagnosticPrincipal("user-1", frozenset({f"{CONTRACT}:analyze"}))

    def envelope(self, request_id):
        return {
            "issued_at": self.now.isoformat(),
            "expires_at": (self.now + timedelta(seconds=20)).isoformat(),
            "request": {"contract": CONTRACT, "request_id": request_id,
                        "operation": "analyze", "text": "Explain this."},
        }

    def run_parallel(self, count, callback):
        barrier = Barrier(count)
        def task(index):
            barrier.wait(timeout=10)
            return callback(index)
        with ThreadPoolExecutor(max_workers=count) as pool:
            return list(pool.map(task, range(count)))

    def test_same_identifier_has_exactly_one_success(self):
        guard = ReplayGuardV6()
        results = self.run_parallel(12, lambda _: guard.dispatch(
            self.envelope("same"), enabled=True, principal=self.principal,
            remaining_budget=1, now=self.now))
        self.assertEqual(sum(result["ok"] for result in results), 1)
        self.assertEqual(
            sum(result.get("error", {}).get("code") == "REPLAY_DETECTED" for result in results), 11)

    def test_distinct_identifiers_all_succeed(self):
        guard = ReplayGuardV6()
        results = self.run_parallel(12, lambda i: guard.dispatch(
            self.envelope(f"unique-{i}"), enabled=True, principal=self.principal,
            remaining_budget=1, now=self.now))
        self.assertTrue(all(result["ok"] for result in results))

    def test_distinct_subjects_same_identifier_succeed(self):
        guard = ReplayGuardV6()
        results = self.run_parallel(8, lambda i: guard.dispatch(
            self.envelope("shared"), enabled=True,
            principal=DiagnosticPrincipal(f"user-{i}", self.principal.scopes),
            remaining_budget=1, now=self.now))
        self.assertTrue(all(result["ok"] for result in results))

    def test_capacity_under_contention(self):
        guard = ReplayGuardV6(max_entries=3)
        results = self.run_parallel(10, lambda i: guard.dispatch(
            self.envelope(f"capacity-{i}"), enabled=True,
            principal=self.principal, remaining_budget=1, now=self.now))
        self.assertEqual(sum(result["ok"] for result in results), 3)
        self.assertEqual(sum(result.get("error", {}).get("code") == "REPLAY_CAPACITY"
                             for result in results), 7)

    def test_repeated_parallel_waves_do_not_duplicate(self):
        guard = ReplayGuardV6()
        for wave in range(3):
            results = self.run_parallel(8, lambda _: guard.dispatch(
                self.envelope(f"wave-{wave}"), enabled=True,
                principal=self.principal, remaining_budget=1, now=self.now))
            self.assertEqual(sum(result["ok"] for result in results), 1)
