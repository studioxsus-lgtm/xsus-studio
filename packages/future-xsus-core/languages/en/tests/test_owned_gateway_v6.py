import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch
from languages.en.integration.adapter_v6 import CONTRACT
from languages.en.integration.access_policy_v6 import DiagnosticPrincipal
from languages.en.integration.owned_replay_store_v6 import OwnedReplayStoreV6
from languages.en.integration.owned_gateway_v6 import dispatch_owned_v6


class OwnedGatewayV6Tests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        self.store = OwnedReplayStoreV6(max_entries=2)
        self.principal = DiagnosticPrincipal("subject", frozenset({f"{CONTRACT}:analyze"}))

    def envelope(self, request_id="one"):
        return {"issued_at": self.now.isoformat(),
                "expires_at": (self.now + timedelta(seconds=10)).isoformat(),
                "request": {"contract": CONTRACT, "request_id": request_id,
                            "operation": "analyze", "text": "Hello."}}

    def send(self, envelope=None, **overrides):
        options = {"store": self.store, "enabled": True, "principal": self.principal,
                   "remaining_budget": 1, "now": self.now}
        options.update(overrides)
        return dispatch_owned_v6(self.envelope() if envelope is None else envelope, **options)

    def test_first_request(self):
        self.assertTrue(self.send()["ok"])

    def test_replay_denied(self):
        self.assertTrue(self.send()["ok"])
        self.assertEqual(self.send()["error"]["code"], "REPLAY_DETECTED")

    def test_disabled_default(self):
        self.assertEqual(dispatch_owned_v6(self.envelope(), store=self.store)["error"]["code"],
                         "FEATURE_DISABLED")

    def test_missing_principal(self):
        self.assertEqual(self.send(principal=None)["error"]["code"], "ACCESS_DENIED")
        self.assertTrue(self.send()["ok"])

    def test_budget_exhaustion_does_not_reserve(self):
        self.assertEqual(self.send(remaining_budget=0)["error"]["code"], "BUDGET_EXHAUSTED")
        self.assertTrue(self.send()["ok"])

    def test_invalid_payload_releases(self):
        bad = self.envelope()
        bad["request"]["text"] = ""
        with self.assertRaises(ValueError):
            self.send(bad)
        self.assertTrue(self.send()["ok"])

    def test_invalid_timestamp_releases(self):
        bad = self.envelope()
        bad["issued_at"] = "bad"
        with self.assertRaises(ValueError):
            self.send(bad)
        self.assertTrue(self.send()["ok"])

    def test_exception_releases(self):
        with patch("languages.en.integration.owned_gateway_v6.dispatch_envelope_v6",
                   side_effect=RuntimeError("failure")):
            with self.assertRaises(RuntimeError):
                self.send()
        self.assertTrue(self.send()["ok"])

    def test_capacity(self):
        self.assertTrue(self.send()["ok"])
        self.assertTrue(self.send(self.envelope("two"))["ok"])
        self.assertEqual(self.send(self.envelope("three"))["error"]["code"], "REPLAY_CAPACITY")

    def test_expired_request_does_not_reserve(self):
        bad = self.envelope()
        bad["expires_at"] = (self.now - timedelta(seconds=1)).isoformat()
        self.assertEqual(self.send(bad)["error"]["code"], "REQUEST_EXPIRED")
        self.assertTrue(self.send()["ok"])

    def test_distinct_subjects(self):
        self.assertTrue(self.send()["ok"])
        other = DiagnosticPrincipal("other", self.principal.scopes)
        self.assertTrue(self.send(principal=other)["ok"])

    def test_invalid_store(self):
        with self.assertRaises(ValueError):
            self.send(store=None)
