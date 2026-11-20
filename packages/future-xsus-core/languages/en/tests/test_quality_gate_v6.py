import json
import unittest
from languages.en.evaluation.quality_gate_v6 import (
    QualityThresholdsV6, evaluate_quality_gate_v6,
)
from languages.en.evaluation.mention_stress_v6 import StressCaseV6


class QualityGateV6Tests(unittest.TestCase):
    def test_default_case_count(self):
        self.assertEqual(evaluate_quality_gate_v6()["cases"], 10)

    def test_default_gate_passes_labeled_fixtures(self):
        self.assertTrue(evaluate_quality_gate_v6()["passed"])

    def test_all_default_checks_pass(self):
        self.assertTrue(all(evaluate_quality_gate_v6()["checks"].values()))

    def test_no_default_false_positives(self):
        self.assertEqual(evaluate_quality_gate_v6()["observed"]["false_positives"],
                         {"contrast": 0, "reference": 0})

    def test_no_default_false_negatives(self):
        self.assertEqual(evaluate_quality_gate_v6()["observed"]["false_negatives"],
                         {"contrast": 0, "reference": 0})

    def test_no_default_regressions(self):
        self.assertEqual(evaluate_quality_gate_v6()["observed"]["regressions"], 0)

    def test_minimum_cases_blocks_small_set(self):
        case = StressCaseV6("plain", "Birds migrate.", False, False, "control")
        r = evaluate_quality_gate_v6((case,))
        self.assertFalse(r["passed"])
        self.assertFalse(r["checks"]["minimum_cases"])

    def test_custom_minimum_cases(self):
        case = StressCaseV6("plain", "Birds migrate.", False, False, "control")
        r = evaluate_quality_gate_v6((case,), thresholds=QualityThresholdsV6(min_cases=1))
        self.assertTrue(r["passed"])

    def test_false_positive_blocks(self):
        case = StressCaseV6("unhandled", "Costs rose. However, work continued.", False, False, "adversarial")
        r = evaluate_quality_gate_v6((case,), thresholds=QualityThresholdsV6(min_cases=1))
        self.assertFalse(r["checks"]["contrast_false_positives"])

    def test_false_negative_blocks(self):
        case = StressCaseV6("miss", "Birds migrate.", True, False, "adversarial")
        r = evaluate_quality_gate_v6((case,), thresholds=QualityThresholdsV6(min_cases=1))
        self.assertFalse(r["checks"]["contrast_false_negatives"])

    def test_regression_blocks(self):
        case = StressCaseV6("regression", "The speaker mentioned she would return.",
                            False, False, "adversarial")
        r = evaluate_quality_gate_v6((case,), thresholds=QualityThresholdsV6(min_cases=1))
        self.assertFalse(r["checks"]["maximum_regressions"])

    def test_custom_threshold_allows_false_positive(self):
        case = StressCaseV6("unhandled", "However, work continued.", False, False, "adversarial")
        r = evaluate_quality_gate_v6((case,), thresholds=QualityThresholdsV6(max_false_positives=1, min_cases=1))
        self.assertTrue(r["passed"])

    def test_reject_negative_threshold(self):
        with self.assertRaises(ValueError):
            evaluate_quality_gate_v6(thresholds=QualityThresholdsV6(max_regressions=-1))

    def test_reject_boolean_threshold(self):
        with self.assertRaises(ValueError):
            evaluate_quality_gate_v6(thresholds=QualityThresholdsV6(min_cases=True))

    def test_reject_zero_minimum(self):
        with self.assertRaises(ValueError):
            evaluate_quality_gate_v6(thresholds=QualityThresholdsV6(min_cases=0))

    def test_reject_wrong_threshold_type(self):
        with self.assertRaises(ValueError):
            evaluate_quality_gate_v6(thresholds=None)

    def test_reject_empty_cases(self):
        with self.assertRaises(ValueError):
            evaluate_quality_gate_v6(())

    def test_reject_duplicate_cases(self):
        case = StressCaseV6("dup", "Birds migrate.", False, False, "control")
        with self.assertRaises(ValueError):
            evaluate_quality_gate_v6((case, case))

    def test_deterministic(self):
        self.assertEqual(evaluate_quality_gate_v6(), evaluate_quality_gate_v6())

    def test_serializable(self):
        json.dumps(evaluate_quality_gate_v6())

    def test_no_deployment_approval(self):
        self.assertFalse(evaluate_quality_gate_v6()["deployment_approved"])

    def test_no_general_accuracy_claim(self):
        self.assertFalse(evaluate_quality_gate_v6()["general_language_accuracy_verified"])

    def test_human_review_required(self):
        self.assertTrue(evaluate_quality_gate_v6()["human_review_required"])
