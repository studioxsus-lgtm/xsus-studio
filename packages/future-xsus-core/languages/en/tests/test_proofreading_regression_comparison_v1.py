import unittest

from languages.en.evaluation.proofreading_regression_comparison_v1 import (
    ProofreadingPredictionV1 as P, compare_proofreading_versions_v1,
)


class ProofreadingRegressionComparisonV1Tests(unittest.TestCase):
    def setUp(self):
        self.reference = [P("a", "corrected", "A"), P("b", "unchanged", "B"),
                          P("c", "review_required", "C")]
        self.baseline = [P("a", "corrected", "A"), P("b", "unchanged", "wrong"),
                         P("c", "review_required", "C")]
        self.candidate = [P("a", "corrected", "wrong"), P("b", "unchanged", "B"),
                          P("c", "review_required", "C")]
        self.sha = "a"*64

    def compare(self, **kwargs):
        return compare_proofreading_versions_v1(
            self.reference, self.baseline, self.candidate,
            dataset_sha256=self.sha, **kwargs
        )

    def test_regression(self):
        self.assertEqual(self.compare()["regressions"], ["a"])

    def test_improvement(self):
        self.assertEqual(self.compare()["improvements"], ["b"])

    def test_unchanged_correct(self):
        self.assertEqual(self.compare()["unchanged_correct"], ["c"])

    def test_baseline_accuracy(self):
        self.assertEqual(self.compare()["baseline_accuracy"], 2/3)

    def test_candidate_accuracy(self):
        self.assertEqual(self.compare()["candidate_accuracy"], 2/3)

    def test_default_fails_regression(self):
        self.assertFalse(self.compare()["passed"])

    def test_allow_one_regression(self):
        self.assertTrue(self.compare(max_regressions=1)["passed"])

    def test_require_two_improvements(self):
        self.assertFalse(self.compare(max_regressions=1, min_improvements=2)["passed"])

    def test_order_independence(self):
        result = compare_proofreading_versions_v1(
            self.reference, list(reversed(self.baseline)),
            list(reversed(self.candidate)), dataset_sha256=self.sha
        )
        self.assertEqual(result["regressions"], ["a"])

    def test_missing_baseline_id(self):
        with self.assertRaises(ValueError):
            compare_proofreading_versions_v1(
                self.reference, self.baseline[:2], self.candidate, dataset_sha256=self.sha
            )

    def test_missing_candidate_id(self):
        with self.assertRaises(ValueError):
            compare_proofreading_versions_v1(
                self.reference, self.baseline, self.candidate[:2], dataset_sha256=self.sha
            )

    def test_duplicate_reference_id(self):
        with self.assertRaises(ValueError):
            compare_proofreading_versions_v1(
                self.reference + [self.reference[0]], self.baseline,
                self.candidate, dataset_sha256=self.sha
            )

    def test_duplicate_baseline_id(self):
        with self.assertRaises(ValueError):
            compare_proofreading_versions_v1(
                self.reference, self.baseline + [self.baseline[0]],
                self.candidate, dataset_sha256=self.sha
            )

    def test_invalid_status(self):
        with self.assertRaises(ValueError):
            compare_proofreading_versions_v1(
                self.reference, self.baseline, [P("a", "unknown", "A"), *self.candidate[1:]],
                dataset_sha256=self.sha
            )

    def test_invalid_sha(self):
        with self.assertRaises(ValueError):
            compare_proofreading_versions_v1(
                self.reference, self.baseline, self.candidate, dataset_sha256="bad"
            )

    def test_boolean_threshold_rejected(self):
        with self.assertRaises(ValueError):
            self.compare(max_regressions=True)

    def test_negative_threshold_rejected(self):
        with self.assertRaises(ValueError):
            self.compare(min_improvements=-1)

    def test_empty_reference_rejected(self):
        with self.assertRaises(ValueError):
            compare_proofreading_versions_v1(
                [], [], [], dataset_sha256=self.sha
            )

    def test_no_release(self):
        self.assertFalse(self.compare()["release_authorized"])

    def test_no_training(self):
        self.assertFalse(self.compare()["training_performed"])

    def test_origin_not_verified(self):
        self.assertFalse(self.compare()["prediction_origin_verified"])

    def test_unchanged_wrong(self):
        self.candidate[1] = P("b", "unchanged", "wrong")
        self.assertEqual(self.compare()["unchanged_wrong"], ["b"])

    def test_all_correct_passes(self):
        result = compare_proofreading_versions_v1(
            self.reference, self.reference, self.reference, dataset_sha256=self.sha
        )
        self.assertTrue(result["passed"])
