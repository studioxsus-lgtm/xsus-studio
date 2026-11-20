import json
import unittest
from dataclasses import asdict
from languages.en.text.mention_aware_signals_v6 import analyze_mention_aware_v6


class MentionAwareV6Tests(unittest.TestCase):
    def test_contrast_mention_filtered(self):
        self.assertFalse(analyze_mention_aware_v6("The word however appears in a sentence.").contrast)

    def test_reference_mention_filtered(self):
        self.assertFalse(analyze_mention_aware_v6("The word she appears in a sentence.").reference)

    def test_real_contrast_kept(self):
        self.assertTrue(analyze_mention_aware_v6("However, costs rose.").contrast)

    def test_real_reference_kept(self):
        self.assertTrue(analyze_mention_aware_v6("Alex arrived. She waved.").reference)

    def test_both_mention_and_real_contrast(self):
        r = analyze_mention_aware_v6("The word however is common. However, costs rose.")
        self.assertTrue(r.contrast)

    def test_both_mention_and_real_reference(self):
        r = analyze_mention_aware_v6("The word she is common. She waved.")
        self.assertTrue(r.reference)

    def test_other_word_not_suppressed(self):
        self.assertTrue(analyze_mention_aware_v6("The word report appears. However, costs rose.").contrast)

    def test_case_insensitive_mention(self):
        self.assertFalse(analyze_mention_aware_v6("THE WORD SHE appears.").reference)

    def test_suppressed_diagnostics(self):
        self.assertIn((0, "she"), analyze_mention_aware_v6("The word she appears.").suppressed)

    def test_no_semantic_claim(self):
        r = analyze_mention_aware_v6("The word she appears.")
        self.assertTrue(r.mention_rule_is_heuristic)
        self.assertFalse(r.understands_quotation)

    def test_json_serializable(self):
        json.dumps(asdict(analyze_mention_aware_v6("The word she appears.")))

    def test_deterministic(self):
        text = "The word however appears."
        self.assertEqual(analyze_mention_aware_v6(text), analyze_mention_aware_v6(text))

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            analyze_mention_aware_v6("")

    def test_oversized_rejected(self):
        with self.assertRaises(ValueError):
            analyze_mention_aware_v6("x" * 10001)

    def test_invalid_type_rejected(self):
        with self.assertRaises(ValueError):
            analyze_mention_aware_v6(None)
