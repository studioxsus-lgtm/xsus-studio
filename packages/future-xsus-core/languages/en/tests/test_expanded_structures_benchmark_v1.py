"""Phase 3.7 generated diverse controlled clause acceptance."""
import unittest
from languages.en.evaluation.expanded_structures_benchmark_v1 import evaluate_expanded_structures


class ExpandedStructuresBenchmarkTests(unittest.TestCase):
    def test_two_thousand_unique_cases(self):
        report = evaluate_expanded_structures()
        self.assertEqual(report["cases"], 2000)
        self.assertEqual(report["unique_cases"], 2000)
        self.assertEqual(report["resolved_correctly"], 2000)
        self.assertTrue(report["passed"])

    def test_scope(self):
        report = evaluate_expanded_structures()
        self.assertEqual(report["adjectives"], 24)
        self.assertEqual(report["adverbs"], 16)
        self.assertFalse(report["independent_external_holdout_proven"])
        self.assertFalse(report["production_authorized"])


if __name__ == "__main__":
    unittest.main()
