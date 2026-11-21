"""Phase 3.4 batch diagnostic tests."""
import unittest
from unittest.mock import patch

from languages.en.evaluation.role_batch_benchmark_v1 import evaluate_role_batch


class RoleBatchBenchmarkTests(unittest.TestCase):
    def test_diagnostic(self):
        report = evaluate_role_batch()
        self.assertTrue(report["passed"])
        self.assertEqual(report["checks_count"], 11)

    def test_no_production_claim(self):
        report = evaluate_role_batch()
        self.assertFalse(report["raw_text_exposed"])
        self.assertFalse(report["production_authorized"])
        self.assertFalse(report["independent_external_holdout_proven"])


if __name__ == "__main__":
    unittest.main()
