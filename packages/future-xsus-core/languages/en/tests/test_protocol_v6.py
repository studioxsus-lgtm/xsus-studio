import json
import unittest
from languages.en.integration.protocol_v6 import MAX_BYTES, handle_json_v6
from languages.en.integration.adapter_v6 import CONTRACT

class ProtocolV6Tests(unittest.TestCase):
    def valid(self):
        return json.dumps({"contract": CONTRACT, "request_id": "r-1", "operation": "analyze", "text": "Hello."})

    def test_disabled_by_default(self):
        self.assertEqual(json.loads(handle_json_v6(self.valid()))["error"]["code"], "FEATURE_DISABLED")

    def test_enabled(self):
        result = json.loads(handle_json_v6(self.valid(), enabled=True))
        self.assertTrue(result["ok"])

    def test_bytes(self):
        self.assertTrue(json.loads(handle_json_v6(self.valid().encode(), enabled=True))["ok"])

    def test_reject_duplicate_keys(self):
        with self.assertRaises(ValueError):
            handle_json_v6('{"contract":"x","contract":"y"}', enabled=True)

    def test_reject_invalid_json(self):
        for raw in ('{', '[]', 'null', b'\xff', '{"x":NaN}'):
            with self.subTest(raw=repr(raw)), self.assertRaises(ValueError):
                handle_json_v6(raw, enabled=True)

    def test_reject_oversized_payload(self):
        with self.assertRaises(ValueError):
            handle_json_v6("x" * (MAX_BYTES + 1))

    def test_reject_invalid_type(self):
        with self.assertRaises(ValueError):
            handle_json_v6(123)

    def test_reject_unknown_fields(self):
        request = json.loads(self.valid())
        request["execute"] = True
        with self.assertRaises(ValueError):
            handle_json_v6(json.dumps(request), enabled=True)

    def test_deterministic_output(self):
        self.assertEqual(handle_json_v6(self.valid(), enabled=True), handle_json_v6(self.valid(), enabled=True))
