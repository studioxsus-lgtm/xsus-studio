import unittest
import json
from core.routing.sq_app_bridge import analyze_app_prompt

class AlbanianAppBridgeTests(unittest.TestCase):
    def test_schema(self):
        result = analyze_app_prompt("Unë jam.")
        self.assertEqual(result["schema_version"], "1.0")
        self.assertEqual(result["language"], "sq")
        self.assertFalse(result["generation_supported"])
        self.assertFalse(result["persisted"])
        json.dumps(result)

    def test_unknown_prompt(self):
        result = analyze_app_prompt("Krijo një aplikacion modern.")
        self.assertFalse(result["quality"]["syntax_supported"])

    def test_invalid_inputs(self):
        for text in (None, "", " ", "a" * 4097):
            with self.subTest(text=text):
                with self.assertRaises(ValueError):
                    analyze_app_prompt(text)
