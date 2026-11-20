import json
import unittest
from dataclasses import asdict
from languages.en.text.continuity_v6 import analyze_continuity_v6


class ContinuityV6Tests(unittest.TestCase):
    def test_single_sentence_no_links(self):
        r = analyze_continuity_v6("The report arrived.")
        self.assertEqual(r.links, ())

    def test_adjacent_shared_term(self):
        r = analyze_continuity_v6("The report arrived. The report was incomplete.")
        self.assertEqual(r.links[0].shared_terms, ("report",))
        self.assertTrue(r.links[0].lexical_link_observed)

    def test_nonadjacent_shared_term(self):
        r = analyze_continuity_v6("The report arrived. Birds migrate. The report was signed.")
        self.assertEqual((r.links[-1].source_sentence, r.links[-1].target_sentence), (1, 2))
        self.assertEqual(r.links[-2].shared_terms, ("report",))

    def test_lookback_one(self):
        r = analyze_continuity_v6("The report arrived. Birds migrate. The report was signed.", lookback=1)
        self.assertEqual(len(r.links), 2)
        self.assertFalse(any(link.shared_terms for link in r.links))

    def test_reference_cues_in_target(self):
        r = analyze_continuity_v6("Alex arrived. She waved.")
        self.assertEqual(r.links[0].target_reference_cues, ("she",))

    def test_reference_is_not_resolved(self):
        r = analyze_continuity_v6("Alex arrived. She waved.")
        self.assertFalse(r.resolves_referents)
        self.assertFalse(r.establishes_semantic_continuity)

    def test_no_shared_terms(self):
        r = analyze_continuity_v6("Birds migrate. Engines run.")
        self.assertFalse(r.links[0].lexical_link_observed)

    def test_stopwords_excluded(self):
        r = analyze_continuity_v6("The cat sleeps. The dog runs.")
        self.assertEqual(r.links[0].shared_terms, ())

    def test_case_insensitive(self):
        r = analyze_continuity_v6("Reports arrived. REPORTS were signed.")
        self.assertEqual(r.links[0].shared_terms, ("reports",))

    def test_deterministic(self):
        text = "The report arrived. It was signed."
        self.assertEqual(analyze_continuity_v6(text), analyze_continuity_v6(text))

    def test_json_serializable(self):
        json.dumps(asdict(analyze_continuity_v6("The report arrived. It was signed.")))

    def test_segmentation_uncertainty(self):
        r = analyze_continuity_v6("Dr. Lee arrived. She waved.")
        self.assertTrue(r.segmentation_uncertain)

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            analyze_continuity_v6("")

    def test_bad_lookback_zero(self):
        with self.assertRaises(ValueError):
            analyze_continuity_v6("Text.", lookback=0)

    def test_bad_lookback_bool(self):
        with self.assertRaises(ValueError):
            analyze_continuity_v6("Text.", lookback=True)

    def test_bad_lookback_large(self):
        with self.assertRaises(ValueError):
            analyze_continuity_v6("Text.", lookback=9)

    def test_oversized_rejected(self):
        with self.assertRaises(ValueError):
            analyze_continuity_v6("x" * 10001)

    def test_three_sentence_links(self):
        r = analyze_continuity_v6("Alpha works. Beta works. Gamma works.")
        self.assertEqual(len(r.links), 3)
