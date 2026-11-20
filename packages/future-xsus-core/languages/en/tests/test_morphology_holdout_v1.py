import unittest
from dataclasses import replace

from languages.en.evaluation.morphology_holdout_v1 import (
    MorphologyCaseV1, MorphologyThresholdsV1,
    ENGLISH_MORPHOLOGY_HOLDOUT_V1, evaluate_morphology_holdout_v1,
)


class MorphologyHoldoutV1Tests(unittest.TestCase):
    def evaluate(self, cases=ENGLISH_MORPHOLOGY_HOLDOUT_V1, **kwargs):
        return evaluate_morphology_holdout_v1(cases, **kwargs)

    def test_reference_cases_pass(self):
        self.assertTrue(self.evaluate()["passed"])

    def test_twenty_cases(self):
        self.assertEqual(self.evaluate()["case_count"], 20)

    def test_all_reference_correct(self):
        self.assertEqual(self.evaluate()["correct_count"], 20)

    def test_accuracy_one(self):
        self.assertEqual(self.evaluate()["accuracy"], 1.0)

    def test_digest_stable(self):
        self.assertEqual(self.evaluate()["dataset_sha256"], self.evaluate()["dataset_sha256"])

    def test_changed_dataset_changes_digest(self):
        changed = list(ENGLISH_MORPHOLOGY_HOLDOUT_V1)
        changed[0] = replace(changed[0], expected="goes")
        self.assertNotEqual(self.evaluate(changed)["dataset_sha256"], self.evaluate()["dataset_sha256"])

    def test_wrong_expected_fails(self):
        wrong = [MorphologyCaseV1("wrong", "go", "past", "goed")]
        result = self.evaluate(wrong, thresholds=MorphologyThresholdsV1(1, 1.0))
        self.assertFalse(result["passed"])

    def test_wrong_expected_observed(self):
        wrong = [MorphologyCaseV1("wrong", "go", "past", "goed")]
        result = self.evaluate(wrong, thresholds=MorphologyThresholdsV1(1, 0.0))
        self.assertEqual(result["results"][0]["observed"], "went")

    def test_baseline_regression_detected(self):
        wrong = [MorphologyCaseV1("wrong", "go", "past", "goed")]
        result = self.evaluate(wrong, thresholds=MorphologyThresholdsV1(1, 0.0),
                               baseline_predictions={"wrong": "goed"})
        self.assertEqual(result["regressions"], ["wrong"])

    def test_no_regression_if_baseline_wrong(self):
        wrong = [MorphologyCaseV1("wrong", "go", "past", "goed")]
        result = self.evaluate(wrong, thresholds=MorphologyThresholdsV1(1, 0.0),
                               baseline_predictions={"wrong": "went"})
        self.assertEqual(result["regressions"], [])

    def test_missing_baseline(self):
        with self.assertRaises(ValueError):
            self.evaluate(baseline_predictions={})

    def test_duplicate_case_id(self):
        with self.assertRaises(ValueError):
            self.evaluate([ENGLISH_MORPHOLOGY_HOLDOUT_V1[0]]*2)

    def test_empty_cases(self):
        with self.assertRaises(ValueError):
            self.evaluate([])

    def test_invalid_form(self):
        with self.assertRaises(ValueError):
            self.evaluate([MorphologyCaseV1("bad", "go", "future", "will go")])

    def test_invalid_lemma(self):
        with self.assertRaises(ValueError):
            self.evaluate([MorphologyCaseV1("bad", "go!", "past", "went")])

    def test_invalid_expected(self):
        with self.assertRaises(ValueError):
            self.evaluate([MorphologyCaseV1("bad", "go", "past", "Went")])

    def test_invalid_case_type(self):
        with self.assertRaises(ValueError):
            self.evaluate(["not a case"])

    def test_invalid_threshold(self):
        with self.assertRaises(ValueError):
            self.evaluate(thresholds=MorphologyThresholdsV1(min_accuracy=1.1))

    def test_boolean_threshold_rejected(self):
        with self.assertRaises(ValueError):
            self.evaluate(thresholds=MorphologyThresholdsV1(min_cases=True))

    def test_min_cases_gate(self):
        self.assertFalse(self.evaluate(
            ENGLISH_MORPHOLOGY_HOLDOUT_V1[:2]
        )["checks"]["minimum_cases"])

    def test_no_training(self):
        self.assertFalse(self.evaluate()["training_performed"])

    def test_no_deployment(self):
        self.assertFalse(self.evaluate()["deployment_approved"])

    def test_not_general_accuracy(self):
        self.assertFalse(self.evaluate()["general_language_accuracy_verified"])

    def test_detailed_results(self):
        self.assertEqual(self.evaluate()["results"][0]["case_id"], "verb-go-past")
