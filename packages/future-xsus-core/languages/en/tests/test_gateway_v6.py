import unittest
from languages.en.integration.gateway_v6 import dispatch_v6
from languages.en.integration.adapter_v6 import CONTRACT

class GatewayV6Tests(unittest.TestCase):
    def request(self):
        return {"contract": CONTRACT, "request_id": "req-1", "operation": "analyze", "text": "Why is it late?"}

    def test_disabled_by_default(self):
        result = dispatch_v6(self.request())
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"]["code"], "FEATURE_DISABLED")

    def test_explicit_disable(self):
        self.assertFalse(dispatch_v6(self.request(), enabled=False)["ok"])

    def test_explicit_enable(self):
        result = dispatch_v6(self.request(), enabled=True)
        self.assertTrue(result["ok"])
        self.assertEqual(result["request_id"], "req-1")

    def test_disabled_does_not_evaluate_request(self):
        result = dispatch_v6({"operation": "execute"}, enabled=False)
        self.assertEqual(result["error"]["code"], "FEATURE_DISABLED")

    def test_enabled_validates_contract(self):
        with self.assertRaises(ValueError):
            dispatch_v6({"operation": "execute"}, enabled=True)

    def test_non_boolean_flag_rejected(self):
        for value in (None, 0, 1, "true", [], {}):
            with self.subTest(value=repr(value)), self.assertRaises(ValueError):
                dispatch_v6(self.request(), enabled=value)

    def test_disabled_does_not_mutate_input(self):
        request = self.request()
        original = dict(request)
        dispatch_v6(request)
        self.assertEqual(request, original)
