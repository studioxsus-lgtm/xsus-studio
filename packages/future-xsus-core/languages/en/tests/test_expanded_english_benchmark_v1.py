"""Expanded-English distinct-case benchmark acceptance."""
import unittest
from languages.en.evaluation.expanded_english_benchmark_v1 import evaluate_expanded_english


class ExpandedBenchmarkTests(unittest.TestCase):
    def test_one_thousand_distinct_cases(self):
        result = evaluate_expanded_english()
        self.assertEqual(result["cases"], 1000)
        self.assertEqual(result["resolved_correctly"], 1000)
        self.assertTrue(result["passed"])

    def test_lexicon_scale_and_scope(self):
        result = evaluate_expanded_english()
        self.assertEqual(result["verb_lemmas"], 40)
        self.assertEqual(result["noun_heads"], 50)
        self.assertEqual(result["subjects"], 15)
        self.assertEqual(result["theoretical_positive_combinations"], 30000)
        self.assertFalse(result["independent_external_holdout_proven"])
        self.assertFalse(result["production_authorized"])


if __name__ == "__main__":
    unittest.main()
