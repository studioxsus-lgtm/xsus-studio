"""Phase 3.5 thousand-sentence benchmark acceptance."""
import unittest

from languages.en.evaluation.role_bulk_benchmark_v1 import evaluate_role_bulk


class RoleBulkBenchmarkTests(unittest.TestCase):
    def test_1000_case_gate(self):
        report = evaluate_role_bulk()
        self.assertEqual(report["cases"], 1000)
        self.assertTrue(report["passed"])
        self.assertTrue(all(report["checks"].values()))

    def test_no_general_understanding_claim(self):
        report = evaluate_role_bulk()
        self.assertFalse(report["raw_text_exposed"])
        self.assertFalse(report["independent_external_holdout_proven"])
        self.assertFalse(report["production_authorized"])


if __name__ == "__main__":
    unittest.main()
