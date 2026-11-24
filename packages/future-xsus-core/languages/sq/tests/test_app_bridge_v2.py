import unittest
from core.routing.sq_app_bridge import analyze_app_prompt, analyze_app_prompt_v2

class AppBridgeV2Tests(unittest.TestCase):
    def test_android(self):
        result = analyze_app_prompt_v2("Krijo një aplikacion Android.")
        self.assertEqual(result["schema_version"], "2.0")
        self.assertEqual(result["technical_request"]["platform"], "android")
        self.assertFalse(result["execution_authorized"])
        self.assertFalse(result["generation_supported"])
        self.assertFalse(result["persisted"])

    def test_unresolved(self):
        result = analyze_app_prompt_v2("Mos krijo një aplikacion.")
        self.assertIsNone(result["technical_request"])
        self.assertEqual(result["interpretation_status"], "unresolved")

    def test_semantics(self):
        result = analyze_app_prompt_v2("Unë krijoj projektin.")
        self.assertEqual(result["semantic_frames"][0]["target"], "project")

    def test_v1_unchanged(self):
        result = analyze_app_prompt("Krijo një aplikacion Android.")
        self.assertEqual(result["schema_version"], "1.0")
        self.assertNotIn("technical_request", result)

    def test_validation(self):
        for value in ("", " " * 10, "x" * 4097, None):
            with self.assertRaises(ValueError):
                analyze_app_prompt_v2(value)
