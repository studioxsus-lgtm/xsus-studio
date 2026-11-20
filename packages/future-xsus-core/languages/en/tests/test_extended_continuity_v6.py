import json
import unittest
from languages.en.text.extended_diagnostics_v6 import analyze_extended_v6
from languages.en.text.analysis_api_v6 import analyze_text_v6
from languages.en.text.continuity_v6 import analyze_continuity_v6
from dataclasses import asdict


class ExtendedContinuityV6Tests(unittest.TestCase):
    def test_continuity_present(self):
        self.assertIn("continuity", analyze_extended_v6("The report arrived."))

    def test_exact_standalone_output(self):
        text = "The report arrived. The report was signed."
        self.assertEqual(analyze_extended_v6(text)["continuity"],
                         asdict(analyze_continuity_v6(text)))

    def test_base_unchanged(self):
        text = "The report arrived."
        self.assertEqual(analyze_extended_v6(text)["base"], analyze_text_v6(text))

    def test_shared_term_across_two_sentences(self):
        r = analyze_extended_v6("The report arrived. The report was signed.")
        self.assertEqual(r["continuity"]["links"][0]["shared_terms"], ("report",))

    def test_reference_cue_without_resolution(self):
        r = analyze_extended_v6("Alex arrived. She waved.")
        self.assertEqual(r["continuity"]["links"][0]["target_reference_cues"], ("she",))
        self.assertFalse(r["continuity"]["resolves_referents"])

    def test_nonadjacent_link(self):
        r = analyze_extended_v6("The report arrived. Birds migrate. The report was signed.")
        links = r["continuity"]["links"]
        self.assertEqual(len(links), 3)
        self.assertEqual(links[1]["shared_terms"], ("report",))

    def test_no_claim_of_semantic_continuity(self):
        r = analyze_extended_v6("Birds migrate. Engines run.")
        self.assertFalse(r["continuity"]["establishes_semantic_continuity"])

    def test_long_document_bounded_links(self):
        text = ("The report arrived. " * 100).strip()
        r = analyze_extended_v6(text)
        self.assertEqual(r["continuity"]["sentence_count"], 100)
        self.assertEqual(len(r["continuity"]["links"]), 197)

    def test_json_serializable(self):
        json.dumps(analyze_extended_v6("The report arrived. It was signed."))

    def test_deterministic(self):
        text = "The report arrived. It was signed."
        self.assertEqual(analyze_extended_v6(text), analyze_extended_v6(text))

    def test_history_base_preserved(self):
        history = ["We discussed the report."]
        text = "Could you clarify the report?"
        self.assertEqual(analyze_extended_v6(text, history)["base"],
                         analyze_text_v6(text, history))

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            analyze_extended_v6("")

    def test_oversized_rejected(self):
        with self.assertRaises(ValueError):
            analyze_extended_v6("x" * 10001)

    def test_multiple_signal_families(self):
        r = analyze_extended_v6("The report arrived. However, she might revise the report.")
        self.assertTrue(r["discourse"]["explicit_cues"])
        self.assertTrue(r["continuity"]["links"][0]["shared_terms"])
        self.assertTrue(r["ambiguity_signals"]["cues"])
