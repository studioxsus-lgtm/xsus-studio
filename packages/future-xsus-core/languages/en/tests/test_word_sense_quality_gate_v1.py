"""Regression checks for conservative lexical evaluation gates."""
import unittest

from languages.en.evaluation.word_sense_benchmark_v1 import evaluate_word_sense
from languages.en.evaluation.word_sense_quality_gate_v1 import check_word_sense_quality


class WordSenseGateTests(unittest.TestCase):
    def setUp(self):
        self.report = evaluate_word_sense()

    def test_packaged_evaluation_passes_diagnostic_gate(self):
        result = check_word_sense_quality(self.report)
        self.assertTrue(result["passed"])
        self.assertFalse(result["production_authorized"])
        self.assertFalse(result["open_domain_understanding_proven"])

    def test_wrong_sense_blocks_gate(self):
        report = dict(self.report)
        report["correct_senses"] -= 1
        report["wrong_senses"] += 1
        self.assertFalse(check_word_sense_quality(report)["passed"])

    def test_false_resolution_blocks_gate(self):
        report = dict(self.report)
        report["true_abstentions"] -= 1
        report["false_resolutions"] += 1
        report["resolved_cases"] += 1
        self.assertFalse(check_word_sense_quality(report)["passed"])

    def test_accuracy_threshold(self):
        self.assertFalse(check_word_sense_quality(self.report, min_labeled_accuracy=1)["passed"])

    def test_coverage_threshold(self):
        self.assertFalse(check_word_sense_quality(self.report, min_coverage=1)["passed"])

    def test_invalid_thresholds_rejected(self):
        for value in (-1, 2, True, float("nan")):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    check_word_sense_quality(self.report, min_coverage=value)

    def test_inconsistent_counts_rejected(self):
        report = dict(self.report)
        report["cases"] += 1
        with self.assertRaises(ValueError):
            check_word_sense_quality(report)

    def test_boolean_counts_rejected(self):
        report = dict(self.report)
        report["wrong_senses"] = False
        with self.assertRaises(ValueError):
            check_word_sense_quality(report)

    def test_missing_contract_rejected(self):
        with self.assertRaises(ValueError):
            check_word_sense_quality({})

    def test_empty_holdout_rejected(self):
        report = dict(self.report)
        report.update(cases=0, labeled_cases=0, expected_abstentions=0,
                      correct_senses=0, wrong_senses=0, missed_senses=0,
                      true_abstentions=0, false_resolutions=0, resolved_cases=0)
        with self.assertRaises(ValueError):
            check_word_sense_quality(report)


if __name__ == "__main__":
    unittest.main()
