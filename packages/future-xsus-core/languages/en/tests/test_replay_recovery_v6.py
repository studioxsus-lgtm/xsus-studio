"""Replay reservation recovery and failure-isolation regressions."""
import unittest
from unittest.mock import patch
from datetime import datetime, timezone, timedelta
from languages.en.integration.adapter_v6 import CONTRACT
from languages.en.integration.access_policy_v6 import DiagnosticPrincipal
from languages.en.integration.replay_guard_v6 import ReplayGuardV6


class ReplayRecoveryV6Tests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        self.guard = ReplayGuardV6(max_entries=2)
        self.principal = DiagnosticPrincipal("user-1", frozenset({f"{CONTRACT}:analyze"}))

    def envelope(self, request_id="retry-1"):
        return {"issued_at": self.now.isoformat(),
                "expires_at": (self.now + timedelta(seconds=10)).isoformat(),
                "request": {"contract": CONTRACT, "request_id": request_id,
                            "operation": "analyze", "text": "Hello."}}

    def send(self, envelope=None):
        return self.guard.dispatch(envelope if envelope is not None else self.envelope(),
                                   enabled=True, principal=self.principal,
                                   remaining_budget=1, now=self.now)

    def test_exception_releases_reservation(self):
        with patch("languages.en.integration.replay_guard_v6.dispatch_envelope_v6",
                   side_effect=RuntimeError("temporary failure")):
            with self.assertRaises(RuntimeError):
                self.send()
        self.assertTrue(self.send()["ok"])

    def test_invalid_request_releases_reservation(self):
        invalid = self.envelope()
        invalid["request"]["text"] = ""
        with self.assertRaises(ValueError):
            self.send(invalid)
        self.assertTrue(self.send()["ok"])

    def test_denied_response_releases_reservation(self):
        response = self.guard.dispatch(self.envelope(), enabled=True,
                                       principal=self.principal, remaining_budget=0, now=self.now)
        self.assertEqual(response["error"]["code"], "BUDGET_EXHAUSTED")
        self.assertTrue(self.send()["ok"])

    def test_success_retains_reservation(self):
        self.assertTrue(self.send()["ok"])
        self.assertEqual(self.send()["error"]["code"], "REPLAY_DETECTED")

    def test_failed_request_does_not_consume_capacity(self):
        bad = self.envelope("bad")
        bad["request"]["text"] = ""
        with self.assertRaises(ValueError):
            self.send(bad)
        self.assertTrue(self.send(self.envelope("first"))["ok"])
        self.assertTrue(self.send(self.envelope("second"))["ok"])

    def test_capacity_restored_after_expiry(self):
        self.assertTrue(self.send(self.envelope("one"))["ok"])
        self.assertTrue(self.send(self.envelope("two"))["ok"])
        later = self.now + timedelta(seconds=11)
        envelope = {"issued_at": later.isoformat(),
                    "expires_at": (later + timedelta(seconds=10)).isoformat(),
                    "request": self.envelope("three")["request"]}
        result = self.guard.dispatch(envelope, enabled=True, principal=self.principal,
                                     remaining_budget=1, now=later)
        self.assertTrue(result["ok"])

    def test_untrusted_principal_does_not_create_reservation(self):
        denied = self.guard.dispatch(self.envelope(), enabled=True, remaining_budget=1, now=self.now)
        self.assertEqual(denied["error"]["code"], "ACCESS_DENIED")
        self.assertTrue(self.send()["ok"])

    def test_failure_does_not_affect_different_subject(self):
        self.assertTrue(self.send()["ok"])
        other = DiagnosticPrincipal("user-2", self.principal.scopes)
        result = self.guard.dispatch(self.envelope(), enabled=True,
                                     principal=other, remaining_budget=1, now=self.now)
        self.assertTrue(result["ok"])
