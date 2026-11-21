"""Three-thousand distinct grammar pattern acceptance."""
import unittest

from languages.en.evaluation.grammar_patterns_benchmark_v1 import evaluate_grammar_patterns


class GrammarPatternsBenchmarkTests(unittest.TestCase):
    def test_three_thousand_distinct_cases(self):
        report = evaluate_grammar_patterns()
        self.assertEqual(report["cases"], 3000)
        self.assertEqual(report["unique_cases"], 3000)
        self.assertEqual(report["resolved_correctly"], 3000)
        self.assertTrue(report["passed"])

    def test_no_general_grammar_claim(self):
        report = evaluate_grammar_patterns()
        self.assertFalse(report["complete_english_grammar_proven"])
        self.assertFalse(report["independent_external_holdout_proven"])
        self.assertFalse(report["production_authorized"])


if __name__ == "__main__":
    unittest.main()
