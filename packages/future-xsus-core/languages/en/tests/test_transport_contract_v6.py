import unittest
from datetime import datetime, timezone, timedelta
from languages.en.integration.adapter_v6 import CONTRACT
from languages.en.integration.access_policy_v6 import DiagnosticPrincipal
from languages.en.integration.transport_contract_v6 import dispatch_envelope_v6

class TransportContractV6Tests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc)
        self.principal = DiagnosticPrincipal("user-1", frozenset({f"{CONTRACT}:analyze"}))

    def envelope(self, issued=None, expiry=None):
        issued = self.now if issued is None else issued
        expiry = self.now + timedelta(seconds=10) if expiry is None else expiry
        return {"issued_at": issued.isoformat(), "expires_at": expiry.isoformat(),
                "request": {"contract": CONTRACT, "request_id": "transport-1",
                            "operation": "analyze", "text": "Hello."}}

    def send(self, envelope, **kwargs):
        return dispatch_envelope_v6(envelope, enabled=True, principal=self.principal,
                                    remaining_budget=1, now=self.now, **kwargs)

    def test_valid_envelope(self):
        self.assertTrue(self.send(self.envelope())["ok"])

    def test_disabled_by_default(self):
        self.assertEqual(dispatch_envelope_v6(self.envelope())["error"]["code"], "FEATURE_DISABLED")

    def test_expired(self):
        envelope = self.envelope(self.now - timedelta(seconds=20), self.now - timedelta(seconds=10))
        self.assertEqual(self.send(envelope)["error"]["code"], "REQUEST_EXPIRED")

    def test_future_issued(self):
        envelope = self.envelope(self.now + timedelta(seconds=1), self.now + timedelta(seconds=10))
        self.assertEqual(self.send(envelope)["error"]["code"], "NOT_YET_VALID")

    def test_excessive_ttl(self):
        with self.assertRaises(ValueError):
            self.send(self.envelope(expiry=self.now + timedelta(seconds=31)))

    def test_zero_ttl(self):
        with self.assertRaises(ValueError):
            self.send(self.envelope(expiry=self.now))

    def test_missing_field(self):
        envelope = self.envelope()
        del envelope["issued_at"]
        with self.assertRaises(ValueError):
            self.send(envelope)

    def test_naive_timestamp(self):
        envelope = self.envelope()
        envelope["issued_at"] = "2026-11-20T12:00:00"
        with self.assertRaises(ValueError):
            self.send(envelope)

    def test_invalid_timestamp(self):
        envelope = self.envelope()
        envelope["expires_at"] = "not-a-date"
        with self.assertRaises(ValueError):
            self.send(envelope)

    def test_denied_without_principal(self):
        result = dispatch_envelope_v6(self.envelope(), enabled=True, now=self.now, remaining_budget=1)
        self.assertEqual(result["error"]["code"], "ACCESS_DENIED")

    def test_budget_exhausted(self):
        result = dispatch_envelope_v6(self.envelope(), enabled=True, now=self.now, principal=self.principal)
        self.assertEqual(result["error"]["code"], "BUDGET_EXHAUSTED")

    def test_invalid_now(self):
        with self.assertRaises(ValueError):
            dispatch_envelope_v6(self.envelope(), enabled=True, now=datetime(2026, 11, 20))

    def test_no_mutation(self):
        envelope = self.envelope()
        before = {"request": dict(envelope["request"]), "issued_at": envelope["issued_at"],
                  "expires_at": envelope["expires_at"]}
        self.send(envelope)
        self.assertEqual(envelope, before)
