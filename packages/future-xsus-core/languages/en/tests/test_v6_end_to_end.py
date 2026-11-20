"""End-to-end regression tests for the opt-in JSON diagnostic boundary."""
import json
import unittest
from languages.en.integration.protocol_v6 import handle_json_v6
from languages.en.integration.adapter_v6 import CONTRACT

class V6EndToEndTests(unittest.TestCase):
    def send(self, operation="analyze", **fields):
        request = {"contract": CONTRACT, "request_id": "e2e-1", "operation": operation, **fields}
        return handle_json_v6(json.dumps(request), enabled=True)

    def test_single_analysis_pipeline(self):
        result = json.loads(self.send(text="Why is the delivery delayed?"))
        self.assertTrue(result["ok"])
        self.assertEqual(result["payload"]["language"], "en")
        for component in ("semantic", "intent", "context", "clarification", "structure"):
            self.assertIn(component, result["payload"])

    def test_batch_pipeline(self):
        result = json.loads(self.send("batch", texts=["Explain this process.", ""]))
        self.assertEqual(result["payload"]["count"], 2)
        self.assertEqual(result["payload"]["failed"], 1)

    def test_disabled_gateway(self):
        request = json.dumps({"contract": CONTRACT, "request_id": "e2e-2", "operation": "analyze", "text": "Hello."})
        result = json.loads(handle_json_v6(request))
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"]["code"], "FEATURE_DISABLED")

    def test_history_preserved(self):
        result = json.loads(self.send(text="Explain that.", history=["The shipment is delayed."]))
        self.assertEqual(len(result["payload"]["context"]["turns"]), 2)

    def test_reject_execution_operation(self):
        with self.assertRaises(ValueError):
            self.send("execute", text="Delete all files")

    def test_reject_unexpected_parameters(self):
        with self.assertRaises(ValueError):
            self.send(text="Hello.", command="run")

    def test_reject_duplicate_json_keys(self):
        with self.assertRaises(ValueError):
            handle_json_v6('{"contract":"x","contract":"y"}', enabled=True)

    def test_repeatability(self):
        first = self.send(text="Summarize this paragraph.")
        for _ in range(20):
            self.assertEqual(self.send(text="Summarize this paragraph."), first)

    def test_batch_maximum_size(self):
        result = json.loads(self.send("batch", texts=["Hello."] * 32))
        self.assertEqual(result["payload"]["succeeded"], 32)

    def test_batch_over_capacity_rejected(self):
        with self.assertRaises(ValueError):
            self.send("batch", texts=["Hello."] * 33)

    def test_empty_text_rejected(self):
        with self.assertRaises(ValueError):
            self.send(text="")

    def test_non_string_text_rejected(self):
        with self.assertRaises(ValueError):
            self.send(text=42)
