import unittest
from dataclasses import asdict
from languages.en.text.reference_signals_v6 import analyze_reference_signals_v6


class ReferenceSignalsV6Tests(unittest.TestCase):
    def test_no_reference(self):
        self.assertEqual(analyze_reference_signals_v6("Alex wrote a report.").references, ())

    def test_reference_in_second_sentence(self):
        r = analyze_reference_signals_v6("Alex wrote a report. She sent it.")
        self.assertIn((1, "she"), r.references)
        self.assertIn((1, "it"), r.references)

    def test_opening_reference(self):
        r = analyze_reference_signals_v6("They arrived.")
        self.assertEqual(r.opening_sentence_references, ("they",))

    def test_no_resolution_claim(self):
        self.assertFalse(analyze_reference_signals_v6("Alex arrived. He waved.").resolves_referents)

    def test_multiple_opening_references(self):
        r = analyze_reference_signals_v6("He gave it to them.")
        self.assertEqual(r.opening_sentence_references, ("he", "it", "them"))

    def test_case_insensitive(self):
        self.assertIn((0, "this"), analyze_reference_signals_v6("THIS matters.").references)

    def test_no_substring_match(self):
        self.assertEqual(analyze_reference_signals_v6("Theirness is unusual.").references, ())

    def test_segmentation_uncertainty(self):
        self.assertTrue(analyze_reference_signals_v6("Dr. Lee arrived. He waved.").segmentation_uncertain)

    def test_serializable(self):
        self.assertIn("references", asdict(analyze_reference_signals_v6("It works.")))

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            analyze_reference_signals_v6("")

    def test_non_string_rejected(self):
        with self.assertRaises(ValueError):
            analyze_reference_signals_v6(3)

    def test_deterministic(self):
        text = "Alex arrived. They waved."
        self.assertEqual(analyze_reference_signals_v6(text), analyze_reference_signals_v6(text))
