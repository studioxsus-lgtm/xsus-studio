import unittest
from core.intelligence.xsus_app_adapter_v1 import XSUSAppIntelligenceAdapter
from core.intelligence.authorized_gateway_v1 import IntelligencePrincipal


class AppAdapterTests(unittest.TestCase):
    def setUp(self):
        self.adapter = XSUSAppIntelligenceAdapter()
        self.principal = IntelligencePrincipal("alice", frozenset(("reason",)))
        self.envelope = {"contractVersion": "1.0.0", "requestId": "r1",
                         "query": "done", "facts": ["start"],
                         "rules": [{"premises": ["start"], "conclusion": "done"}]}

    def test_resolved(self):
        result = self.adapter.reason(self.principal, self.envelope)
        self.assertEqual(result["answer"], "done")
        self.assertTrue(result["verifiedDerivation"])
        self.assertFalse(result["executionAuthorized"])
        self.assertEqual(result["requestId"], "r1")

    def test_unknown(self):
        result = self.adapter.reason(self.principal, dict(self.envelope, query="unknown"))
        self.assertEqual(result["status"], "abstained")
        self.assertIsNone(result["answer"])

    def test_version(self):
        with self.assertRaises(ValueError):
            self.adapter.reason(self.principal, dict(self.envelope, contractVersion="2.0.0"))

    def test_no_owner_override(self):
        with self.assertRaises(ValueError):
            self.adapter.reason(self.principal, dict(self.envelope, ownerId="bob"))

    def test_no_permission(self):
        with self.assertRaises(PermissionError):
            self.adapter.reason(IntelligencePrincipal("alice", frozenset()), self.envelope)

    def test_missing_identity(self):
        with self.assertRaises(PermissionError):
            self.adapter.reason(None, self.envelope)

    def test_bad_rule(self):
        with self.assertRaises(ValueError):
            self.adapter.reason(self.principal, dict(self.envelope, rules=[{"premises": "start"}]))

    def test_fact_limit(self):
        with self.assertRaises(ValueError):
            self.adapter.reason(self.principal, dict(self.envelope, facts=["start"] * 257))

    def test_invalid_atom(self):
        with self.assertRaises(ValueError):
            self.adapter.reason(self.principal, dict(self.envelope, query="INVALID"))
