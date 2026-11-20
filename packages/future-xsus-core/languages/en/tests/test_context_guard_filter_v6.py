import json
import unittest
from dataclasses import asdict
from languages.en.text.context_guard_filter_v6 import analyze_context_guard_v6 as analyze


class ContextGuardFilterV6Tests(unittest.TestCase):
    def test_mention_in_class_contrast(self):
        self.assertFalse(analyze("A teacher mentioned however in class.").contrast)

    def test_discussed_in_class_contrast(self):
        self.assertFalse(analyze("They discussed however in class.").contrast)

    def test_discussed_in_class_reference(self):
        self.assertFalse(analyze("A teacher discussed she in class.").reference)

    def test_mentioned_clause_contrast_retained(self):
        self.assertTrue(analyze("The speaker mentioned however, costs rose.").contrast)

    def test_mentioned_clause_reference_retained(self):
        self.assertTrue(analyze("The speaker mentioned she would return.").reference)

    def test_real_contrast_retained(self):
        self.assertTrue(analyze("However, costs rose.").contrast)

    def test_real_reference_retained(self):
        self.assertTrue(analyze("Alex arrived. She waved.").reference)

    def test_quoted_word_contrast(self):
        self.assertFalse(analyze('He wrote "however" on the board.').contrast)

    def test_quoted_word_reference(self):
        self.assertFalse(analyze('The sign reads "she".').reference)

    def test_quoted_speech_contrast_retained(self):
        self.assertTrue(analyze('"However, costs rose."').contrast)

    def test_quoted_speech_reference_retained(self):
        self.assertTrue(analyze('"She returned."').reference)

    def test_word_mention(self):
        self.assertFalse(analyze("The word however appears.").contrast)

    def test_mixed_usage(self):
        self.assertTrue(analyze("They discussed however in class. However, costs rose.").contrast)

    def test_reason(self):
        self.assertIn((0, "however", "guarded_indirect_mention"),
                      analyze("They discussed however in class.").suppressed)

    def test_no_semantic_claim(self):
        self.assertFalse(analyze("However, costs rose.").understands_semantics)

    def test_serializable(self):
        json.dumps(asdict(analyze("However, costs rose.")))

    def test_deterministic(self):
        self.assertEqual(analyze("A teacher discussed she in class."),
                         analyze("A teacher discussed she in class."))

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            analyze("")

    def test_invalid_type_rejected(self):
        with self.assertRaises(ValueError):
            analyze(None)

    def test_oversized_rejected(self):
        with self.assertRaises(ValueError):
            analyze("x" * 10001)
