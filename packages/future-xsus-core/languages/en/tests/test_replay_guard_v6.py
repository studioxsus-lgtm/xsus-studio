import unittest
from datetime import datetime, timezone, timedelta
from languages.en.integration.adapter_v6 import CONTRACT
from languages.en.integration.access_policy_v6 import DiagnosticPrincipal
from languages.en.integration.replay_guard_v6 import ReplayGuardV6

class ReplayGuardV6Tests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc)
        self.principal = DiagnosticPrincipal("user-1", frozenset({f"{CONTRACT}:analyze"}))
        self.guard = ReplayGuardV6()

    def envelope(self, request_id="req-1"):
        return {"issued_at": self.now.isoformat(),
                "expires_at": (self.now + timedelta(seconds=10)).isoformat(),
                "request": {"contract": CONTRACT, "request_id": request_id,
                            "operation": "analyze", "text": "Hello."}}

    def send(self, envelope=None, **kwargs):
        return self.guard.dispatch(envelope or self.envelope(), enabled=True,
                                   principal=self.principal, remaining_budget=1,
                                   now=self.now, **kwargs)

    def test_first_request_allowed(self):
        self.assertTrue(self.send()["ok"])

    def test_duplicate_rejected(self):
        self.assertTrue(self.send()["ok"])
        self.assertEqual(self.send()["error"]["code"], "REPLAY_DETECTED")

    def test_distinct_request_ids(self):
        self.assertTrue(self.send(self.envelope("one"))["ok"])
        self.assertTrue(self.send(self.envelope("two"))["ok"])

    def test_distinct_subjects(self):
        self.assertTrue(self.send()["ok"])
        other = DiagnosticPrincipal("user-2", self.principal.scopes)
        result = self.guard.dispatch(self.envelope(), enabled=True, principal=other,
                                     remaining_budget=1, now=self.now)
        self.assertTrue(result["ok"])

    def test_expired_entry_removed(self):
        self.send()
        later = self.now + timedelta(seconds=11)
        envelope = {"issued_at": later.isoformat(),
                    "expires_at": (later + timedelta(seconds=10)).isoformat(),
                    "request": self.envelope()["request"]}
        result = self.guard.dispatch(envelope, enabled=True, principal=self.principal,
                                     remaining_budget=1, now=later)
        self.assertTrue(result["ok"])

    def test_disabled_does_not_reserve(self):
        self.assertEqual(self.guard.dispatch(self.envelope())["error"]["code"], "FEATURE_DISABLED")
        self.assertTrue(self.send()["ok"])

    def test_invalid_request_does_not_reserve(self):
        bad = self.envelope()
        bad["request"]["text"] = ""
        with self.assertRaises(ValueError):
            self.send(bad)
        self.assertTrue(self.send()["ok"])

    def test_denied_does_not_reserve(self):
        denied = self.guard.dispatch(self.envelope(), enabled=True,
                                     remaining_budget=1, now=self.now)
        self.assertEqual(denied["error"]["code"], "ACCESS_DENIED")
        self.assertTrue(self.send()["ok"])

    def test_capacity_rejected(self):
        guard = ReplayGuardV6(max_entries=1)
        self.assertTrue(guard.dispatch(self.envelope("one"), enabled=True,
                                       principal=self.principal, remaining_budget=1, now=self.now)["ok"])
        result = guard.dispatch(self.envelope("two"), enabled=True,
                                principal=self.principal, remaining_budget=1, now=self.now)
        self.assertEqual(result["error"]["code"], "REPLAY_CAPACITY")

    def test_invalid_capacity(self):
        for value in (0, -1, True, 100001):
            with self.subTest(value=value), self.assertRaises(ValueError):
                ReplayGuardV6(max_entries=value)

    def test_invalid_activation(self):
        with self.assertRaises(ValueError):
            self.guard.dispatch(self.envelope(), enabled="true")

    def test_different_guard_instances_are_independent(self):
        self.assertTrue(self.send()["ok"])
        other_guard = ReplayGuardV6()
        self.assertTrue(other_guard.dispatch(self.envelope(), enabled=True,
                                             principal=self.principal, remaining_budget=1, now=self.now)["ok"])
