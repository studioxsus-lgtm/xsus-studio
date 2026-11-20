"""Protocol-focused regression cases. No actual network service is started."""
import json
import unittest
from languages.en.integration.protocol_v6 import handle_json_v6, MAX_BYTES
from languages.en.integration.adapter_v6 import CONTRACT

class V6ProtocolSecurityTests(unittest.TestCase):
    def request(self, **overrides):
        return {"contract": CONTRACT, "request_id": "security-1", "operation": "analyze", "text": "Hello.", **overrides}

    def test_unicode_roundtrip(self):
        result = json.loads(handle_json_v6(json.dumps(self.request(text="Explain café and naïve.")), enabled=True))
        self.assertTrue(result["ok"])

    def test_invalid_utf8(self):
        with self.assertRaises(ValueError):
            handle_json_v6(b"\xff\xfe", enabled=True)

    def test_oversized_utf8_payload(self):
        with self.assertRaises(ValueError):
            handle_json_v6(json.dumps(self.request(text="é" * MAX_BYTES)), enabled=True)

    def test_array_root_rejected(self):
        with self.assertRaises(ValueError):
            handle_json_v6("[]", enabled=True)

    def test_nested_unexpected_field_rejected(self):
        with self.assertRaises(ValueError):
            handle_json_v6(json.dumps(self.request(metadata={"role": "admin"})), enabled=True)

    def test_unknown_operation_rejected(self):
        with self.assertRaises(ValueError):
            handle_json_v6(json.dumps(self.request(operation="system")), enabled=True)

    def test_invalid_request_identifier(self):
        with self.assertRaises(ValueError):
            handle_json_v6(json.dumps(self.request(request_id="bad id")), enabled=True)

    def test_boolean_activation_strict(self):
        with self.assertRaises(ValueError):
            handle_json_v6(json.dumps(self.request()), enabled="true")

    def test_disabled_does_not_analyze(self):
        result = json.loads(handle_json_v6(json.dumps(self.request(operation="execute"))))
        self.assertEqual(result["error"]["code"], "FEATURE_DISABLED")

    def test_json_object_is_not_mutated(self):
        request = self.request()
        original = dict(request)
        handle_json_v6(json.dumps(request), enabled=True)
        self.assertEqual(request, original)
