import json
import unittest
from languages.en.evaluation.holdout_quality_v6 import (
    HOLDOUT_CASES_V6, evaluate_holdout_quality_v6,
)
from languages.en.evaluation.quality_gate_v6 import QualityThresholdsV6


class HoldoutQualityV6Tests(unittest.TestCase):
    def test_ten_distinct_cases(self):
        self.assertEqual(len(HOLDOUT_CASES_V6), 10)
        self.assertEqual(len({c.name for c in HOLDOUT_CASES_V6}), 10)

    def test_gate_uses_all_holdout_cases(self):
        self.assertEqual(evaluate_holdout_quality_v6()["gate"]["cases"], 10)

    def test_strict_gate_fails_on_unhandled_mentions(self):
        self.assertFalse(evaluate_holdout_quality_v6()["gate"]["passed"])

    def test_contrast_false_positive_exposed(self):
        self.assertGreater(evaluate_holdout_quality_v6()["gate"]["observed"]["false_positives"]["contrast"], 0)

    def test_reference_false_positive_exposed(self):
        self.assertGreater(evaluate_holdout_quality_v6()["gate"]["observed"]["false_positives"]["reference"], 0)

    def test_false_positive_checks_fail(self):
        checks = evaluate_holdout_quality_v6()["gate"]["checks"]
        self.assertFalse(checks["contrast_false_positives"])
        self.assertFalse(checks["reference_false_positives"])

    def test_gate_does_not_approve_deployment(self):
        self.assertFalse(evaluate_holdout_quality_v6()["deployment_approved"])

    def test_no_independence_claim(self):
        self.assertFalse(evaluate_holdout_quality_v6()["statistically_independent_sample"])

    def test_known_errors_declared(self):
        self.assertTrue(evaluate_holdout_quality_v6()["known_challenge_errors_expected"])

    def test_contract(self):
        self.assertEqual(evaluate_holdout_quality_v6()["contract"],
                         "future-xsus-core.v6.holdout-quality")

    def test_thresholds_passed_through(self):
        r = evaluate_holdout_quality_v6(thresholds=QualityThresholdsV6(max_false_positives=10))
        self.assertTrue(r["gate"]["checks"]["contrast_false_positives"])

    def test_json_serializable(self):
        json.dumps(evaluate_holdout_quality_v6())

    def test_deterministic(self):
        self.assertEqual(evaluate_holdout_quality_v6(), evaluate_holdout_quality_v6())

    def test_invalid_threshold_rejected(self):
        with self.assertRaises(ValueError):
            evaluate_holdout_quality_v6(thresholds=None)
