"""Phase 3 quality gate failure injection."""
import unittest
from unittest.mock import patch

from languages.en.evaluation.action_semantics_benchmark_v1 import evaluate_action_semantics
from languages.en.evaluation.action_semantics_quality_gate_v1 import evaluate_action_quality_gate


class ActionQualityGateTests(unittest.TestCase):
    def test_authored_gate_passes(self):
        result = evaluate_action_quality_gate()
        self.assertTrue(result["passed"])
        self.assertTrue(all(result["checks"].values()))

    def test_wrong_classification_fails_closed(self):
        report = evaluate_action_semantics()
        report["wrong"] = 1
        report["correct"] -= 1
        with patch("languages.en.evaluation.action_semantics_quality_gate_v1.evaluate_action_semantics",
                   return_value=report):
            self.assertFalse(evaluate_action_quality_gate()["passed"])

    def test_false_resolution_fails_closed(self):
        report = evaluate_action_semantics()
        report["false_resolutions"] = 1
        report["true_abstentions"] -= 1
        with patch("languages.en.evaluation.action_semantics_quality_gate_v1.evaluate_action_semantics",
                   return_value=report):
            self.assertFalse(evaluate_action_quality_gate()["passed"])

    def test_missing_cases_fails_closed(self):
        report = evaluate_action_semantics()
        report["cases"] = 0
        with patch("languages.en.evaluation.action_semantics_quality_gate_v1.evaluate_action_semantics",
                   return_value=report):
            self.assertFalse(evaluate_action_quality_gate()["passed"])


if __name__ == "__main__":
    unittest.main()
