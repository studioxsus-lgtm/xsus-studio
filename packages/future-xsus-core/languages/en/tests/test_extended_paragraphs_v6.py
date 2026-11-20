import json
import unittest
from dataclasses import asdict
from languages.en.text.analysis_api_v6 import analyze_text_v6
from languages.en.text.extended_diagnostics_v6 import analyze_extended_v6
from languages.en.text.paragraph_structure_v6 import analyze_paragraphs_v6


class ExtendedParagraphsV6Tests(unittest.TestCase):
    def test_paragraphs_included(self):
        self.assertIn("paragraph_structure", analyze_extended_v6("The report arrived."))

    def test_exact_standalone_result(self):
        text = "The report arrived.\n\nThe report was signed."
        self.assertEqual(analyze_extended_v6(text)["paragraph_structure"],
                         asdict(analyze_paragraphs_v6(text)))

    def test_base_unchanged(self):
        text = "The report arrived."
        self.assertEqual(analyze_extended_v6(text)["base"], analyze_text_v6(text))

    def test_two_paragraphs(self):
        r = analyze_extended_v6("The report arrived.\n\nThe report was signed.")
        self.assertEqual(r["paragraph_structure"]["paragraph_count"], 2)

    def test_shared_terms(self):
        r = analyze_extended_v6("The report arrived.\n\nThe report was signed.")
        self.assertEqual(r["paragraph_structure"]["adjacent_links"][0]["shared_terms"], ("report",))

    def test_no_quality_claim(self):
        r = analyze_extended_v6("The report arrived.")
        self.assertFalse(r["paragraph_structure"]["evaluates_document_quality"])

    def test_multiple_signal_families(self):
        r = analyze_extended_v6("The report arrived.\n\nHowever, she might revise the report.")
        self.assertEqual(r["paragraph_structure"]["paragraph_count"], 2)
        self.assertTrue(r["discourse"]["explicit_cues"])
        self.assertTrue(r["ambiguity_signals"]["cues"])

    def test_json_serializable(self):
        json.dumps(analyze_extended_v6("The report arrived.\n\nThe report was signed."))

    def test_long_text(self):
        text = ("The report arrived.\n\n" * 80).strip()
        self.assertEqual(analyze_extended_v6(text)["paragraph_structure"]["paragraph_count"], 80)

    def test_deterministic(self):
        text = "The report arrived.\n\nThe report was signed."
        self.assertEqual(analyze_extended_v6(text), analyze_extended_v6(text))

    def test_history_preserved(self):
        history = ["We discussed the report."]
        text = "Could you clarify the report?"
        self.assertEqual(analyze_extended_v6(text, history)["base"], analyze_text_v6(text, history))

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            analyze_extended_v6("")

    def test_oversized_rejected(self):
        with self.assertRaises(ValueError):
            analyze_extended_v6("x" * 10001)
