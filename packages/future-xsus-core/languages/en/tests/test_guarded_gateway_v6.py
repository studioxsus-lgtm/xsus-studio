import unittest
from languages.en.integration.access_policy_v6 import DiagnosticPrincipal
from languages.en.integration.adapter_v6 import CONTRACT
from languages.en.integration.guarded_gateway_v6 import dispatch_guarded_v6

class GuardedGatewayV6Tests(unittest.TestCase):
    def request(self, operation="analyze"):
        return {"contract": CONTRACT, "request_id": "guard-1", "operation": operation, "text": "Hello."}

    def principal(self, *operations):
        return DiagnosticPrincipal("user-1", frozenset(f"{CONTRACT}:{op}" for op in operations))

    def test_disabled_by_default(self):
        self.assertEqual(dispatch_guarded_v6(self.request())["error"]["code"], "FEATURE_DISABLED")

    def test_missing_principal_denied(self):
        self.assertEqual(dispatch_guarded_v6(self.request(), enabled=True, remaining_budget=1)["error"]["code"], "ACCESS_DENIED")

    def test_wrong_scope_denied(self):
        self.assertEqual(dispatch_guarded_v6(self.request(), enabled=True, principal=self.principal("batch"), remaining_budget=1)["error"]["code"], "ACCESS_DENIED")

    def test_allowed_with_budget(self):
        result = dispatch_guarded_v6(self.request(), enabled=True, principal=self.principal("analyze"), remaining_budget=1)
        self.assertTrue(result["ok"])

    def test_zero_budget(self):
        result = dispatch_guarded_v6(self.request(), enabled=True, principal=self.principal("analyze"))
        self.assertEqual(result["error"]["code"], "BUDGET_EXHAUSTED")

    def test_invalid_budget(self):
        for budget in (-1, True, None, 1.2):
            with self.subTest(budget=budget), self.assertRaises(ValueError):
                dispatch_guarded_v6(self.request(), enabled=True, principal=self.principal("analyze"), remaining_budget=budget)

    def test_invalid_activation(self):
        with self.assertRaises(ValueError):
            dispatch_guarded_v6(self.request(), enabled="true")

    def test_invalid_principal_scope(self):
        principal = DiagnosticPrincipal("user-1", frozenset({"unrelated"}))
        self.assertEqual(dispatch_guarded_v6(self.request(), enabled=True, principal=principal, remaining_budget=1)["error"]["code"], "ACCESS_DENIED")

    def test_invalid_principal_subject(self):
        principal = DiagnosticPrincipal("", frozenset({f"{CONTRACT}:analyze"}))
        self.assertEqual(dispatch_guarded_v6(self.request(), enabled=True, principal=principal, remaining_budget=1)["error"]["code"], "ACCESS_DENIED")

    def test_unknown_operation_denied(self):
        self.assertEqual(dispatch_guarded_v6(self.request("execute"), enabled=True, principal=self.principal("analyze"), remaining_budget=1)["error"]["code"], "ACCESS_DENIED")
