"""Phase 3.3 authored role diagnostic contracts."""
import unittest
from languages.en.evaluation.role_semantics_benchmark_v1 import evaluate_role_semantics


class RoleBenchmarkTests(unittest.TestCase):
    def test_authored_diagnostic(self):
        result = evaluate_role_semantics()
        self.assertEqual(result["cases"], 18)
        self.assertEqual(result["single_cases"], 12)
        self.assertEqual(result["pair_cases"], 6)
        self.assertTrue(result["passed"])
        self.assertEqual(result["failures"], 0)

    def test_does_not_claim_independent_validation(self):
        result = evaluate_role_semantics()
        self.assertFalse(result["raw_text_exposed"])
        self.assertFalse(result["independent_external_holdout_proven"])
        self.assertFalse(result["production_authorized"])


if __name__ == "__main__":
    unittest.main()
