import json
import unittest
from languages.en.integration.adapter_v6 import CONTRACT, handle_diagnostic_request_v6

class AdapterV6Tests(unittest.TestCase):
    def request(self, **changes):
        return {"contract": CONTRACT, "request_id": "req-123", "operation": "analyze", "text": "Why is it late?", **changes}

    def test_analyze(self):
        result = handle_diagnostic_request_v6(self.request())
        self.assertTrue(result["ok"])
        self.assertEqual(result["payload"]["language"], "en")
        self.assertEqual(result["request_id"], "req-123")
        json.dumps(result)

    def test_batch(self):
        result = handle_diagnostic_request_v6({
            "contract": CONTRACT, "request_id": "req-2",
            "operation": "batch", "texts": ["Hello.", ""]})
        self.assertEqual(result["payload"]["failed"], 1)

    def test_history(self):
        result = handle_diagnostic_request_v6(self.request(history=["The shipment is delayed."]))
        self.assertEqual(len(result["payload"]["context"]["turns"]), 2)

    def test_contract_rejected(self):
        with self.assertRaises(ValueError):
            handle_diagnostic_request_v6(self.request(contract="wrong"))

    def test_request_id_rejected(self):
        for value in ("", "bad id", "a" * 129, None):
            with self.subTest(value=str(value)[:10]), self.assertRaises(ValueError):
                handle_diagnostic_request_v6(self.request(request_id=value))

    def test_unknown_fields_rejected(self):
        with self.assertRaises(ValueError):
            handle_diagnostic_request_v6(self.request(execute=True))

    def test_operation_rejected(self):
        with self.assertRaises(ValueError):
            handle_diagnostic_request_v6(self.request(operation="execute"))

    def test_cross_operation_fields_rejected(self):
        with self.assertRaises(ValueError):
            handle_diagnostic_request_v6(self.request(operation="batch", texts=["Hello."]))

    def test_missing_text_rejected(self):
        with self.assertRaises(ValueError):
            handle_diagnostic_request_v6({"contract": CONTRACT, "request_id": "req-1", "operation": "analyze"})

    def test_input_not_mutated(self):
        request = self.request()
        original = dict(request)
        handle_diagnostic_request_v6(request)
        self.assertEqual(request, original)
