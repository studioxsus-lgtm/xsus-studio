import json
import unittest
from dataclasses import asdict
from languages.en.text.temporal_mention_filter_v6 import analyze_temporal_mention_v6 as analyze


class TemporalMentionFilterV6Tests(unittest.TestCase):
    def test_discussed_contrast_yesterday(self):
        self.assertFalse(analyze("A lecturer discussed however yesterday.").contrast)

    def test_discussed_reference_yesterday(self):
        self.assertFalse(analyze("A lecturer discussed she yesterday.").reference)

    def test_real_contrast(self):
        self.assertTrue(analyze("However, costs rose.").contrast)

    def test_real_reference(self):
        self.assertTrue(analyze("Maria called. She answered.").reference)

    def test_existing_class_rule(self):
        self.assertFalse(analyze("A teacher discussed however in class.").contrast)

    def test_existing_word_rule(self):
        self.assertFalse(analyze("The word she is common.").reference)

    def test_existing_quotation_rule(self):
        self.assertFalse(analyze('A sign displayed "however".').contrast)

    def test_mixed_contrast(self):
        self.assertTrue(analyze("A lecturer discussed however yesterday. However, costs rose.").contrast)

    def test_mixed_reference(self):
        self.assertTrue(analyze("A lecturer discussed she yesterday. She answered.").reference)

    def test_clause_not_filtered(self):
        self.assertTrue(analyze("A lecturer discussed she would return.").reference)

    def test_reason(self):
        self.assertIn((0, "however", "temporal_indirect_mention"),
                      analyze("A lecturer discussed however yesterday.").suppressed)

    def test_no_semantics_claim(self):
        self.assertFalse(analyze("However, costs rose.").understands_semantics)

    def test_not_production(self):
        self.assertFalse(analyze("However, costs rose.").production_enabled)

    def test_deterministic(self):
        text = "A lecturer discussed she yesterday."
        self.assertEqual(analyze(text), analyze(text))

    def test_json(self):
        json.dumps(asdict(analyze("A lecturer discussed she yesterday.")))

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            analyze("")

    def test_invalid_rejected(self):
        with self.assertRaises(ValueError):
            analyze(None)
