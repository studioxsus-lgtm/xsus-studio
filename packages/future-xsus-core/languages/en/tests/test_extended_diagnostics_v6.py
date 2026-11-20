import json
import unittest
from languages.en.text.analysis_api_v6 import analyze_text_v6
from languages.en.text.extended_diagnostics_v6 import analyze_extended_v6


class ExtendedDiagnosticsV6Tests(unittest.TestCase):
    def test_contract(self):
        r = analyze_extended_v6("The report arrived.")
        self.assertEqual(r["contract_version"], "6.0.0-experimental-extended")

    def test_language(self):
        self.assertEqual(analyze_extended_v6("The report arrived.")["language"], "en")

    def test_base_unchanged(self):
        text = "The report arrived."
        self.assertEqual(analyze_extended_v6(text)["base"], analyze_text_v6(text))

    def test_base_with_history(self):
        text = "Can you clarify?"
        history = ["We discussed the report."]
        self.assertEqual(analyze_extended_v6(text, history)["base"],
                         analyze_text_v6(text, history))

    def test_discourse_included(self):
        r = analyze_extended_v6("The report arrived. However, it was incomplete.")
        self.assertIn("discourse", r)
        self.assertTrue(r["discourse"]["explicit_cues"])

    def test_argument_included(self):
        r = analyze_extended_v6("The report arrived. Therefore, we started.")
        self.assertTrue(r["argument_signals"]["markers"])

    def test_references_included(self):
        r = analyze_extended_v6("Alex arrived. She waved.")
        self.assertIn((1, "she"), r["reference_signals"]["references"])

    def test_ambiguity_included(self):
        r = analyze_extended_v6("Maybe someone will arrive.")
        self.assertTrue(r["ambiguity_signals"]["cues"])

    def test_no_resolution_claim(self):
        r = analyze_extended_v6("Alex arrived. She waved.")
        self.assertFalse(r["capabilities"]["resolves_references"])

    def test_no_verification_claim(self):
        r = analyze_extended_v6("Therefore, the claim is true.")
        self.assertFalse(r["capabilities"]["verifies_arguments"])

    def test_no_generation_claim(self):
        r = analyze_extended_v6("Please respond.")
        self.assertFalse(r["capabilities"]["generates_response"])

    def test_json_serializable(self):
        json.dumps(analyze_extended_v6("The report arrived."))

    def test_deterministic(self):
        text = "The report arrived. However, it was incomplete."
        self.assertEqual(analyze_extended_v6(text), analyze_extended_v6(text))

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            analyze_extended_v6("")

    def test_invalid_type_rejected(self):
        with self.assertRaises(ValueError):
            analyze_extended_v6(None)

    def test_oversized_rejected(self):
        with self.assertRaises(ValueError):
            analyze_extended_v6("x" * 10001)
