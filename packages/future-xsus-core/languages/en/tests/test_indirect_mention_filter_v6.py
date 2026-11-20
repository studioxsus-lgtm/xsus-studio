import json
import unittest
from dataclasses import asdict
from languages.en.text.indirect_mention_filter_v6 import analyze_indirect_mention_v6 as analyze


class IndirectMentionFilterV6Tests(unittest.TestCase):
    def test_mentioned_contrast(self):
        self.assertFalse(analyze("A teacher mentioned however in class.").contrast)

    def test_mentioned_reference(self):
        self.assertFalse(analyze("A teacher mentioned she in class.").reference)

    def test_referred_to_contrast(self):
        self.assertFalse(analyze("A teacher referred to however in class.").contrast)

    def test_referred_to_reference(self):
        self.assertFalse(analyze("A teacher referred to she in class.").reference)

    def test_real_contrast(self):
        self.assertTrue(analyze("However, costs rose.").contrast)

    def test_real_reference(self):
        self.assertTrue(analyze("Alex arrived. She waved.").reference)

    def test_mixed_contrast(self):
        self.assertTrue(analyze("A teacher mentioned however. However, costs rose.").contrast)

    def test_mixed_reference(self):
        self.assertTrue(analyze("A teacher mentioned she. She waved.").reference)

    def test_quoted_contrast(self):
        self.assertFalse(analyze('He wrote "however" on the board.').contrast)

    def test_quoted_reference(self):
        self.assertFalse(analyze('The sign reads "she".').reference)

    def test_word_mention(self):
        self.assertFalse(analyze("The word however appears.").contrast)

    def test_reason(self):
        self.assertIn((0, "however", "indirect_mention"),
                      analyze("A teacher mentioned however in class.").suppressed)

    def test_mention_other_word(self):
        self.assertTrue(analyze("A teacher mentioned plans. However, costs rose.").contrast)

    def test_no_semantic_claim(self):
        self.assertFalse(analyze("However, costs rose.").understands_semantics)

    def test_json_serializable(self):
        json.dumps(asdict(analyze("However, costs rose.")))

    def test_deterministic(self):
        text = "A teacher mentioned however."
        self.assertEqual(analyze(text), analyze(text))

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            analyze("")

    def test_invalid_type_rejected(self):
        with self.assertRaises(ValueError):
            analyze(None)

    def test_oversized_rejected(self):
        with self.assertRaises(ValueError):
            analyze("x" * 10001)
