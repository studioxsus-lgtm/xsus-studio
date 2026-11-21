import unittest
from languages.en.learning.synthetic_feedback_experiment_v1 import run_synthetic_feedback_experiment_v1


class SyntheticFeedbackExperimentV1Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report=run_synthetic_feedback_experiment_v1()

    def test_contract(self):
        self.assertEqual(self.report["contract"],"future-xsus-core.synthetic-feedback-experiment.v1")

    def test_real_training(self):
        self.assertTrue(self.report["real_neural_training"])

    def test_real_scoring(self):
        self.assertTrue(self.report["real_benchmark_scoring"])

    def test_synthetic_only(self):
        self.assertTrue(self.report["synthetic_feedback_only"])

    def test_no_production_quality_claim(self):
        self.assertFalse(self.report["independent_production_quality_proven"])

    def test_loss_before(self):
        self.assertIsInstance(self.report["feedback_loss_before"],float)

    def test_loss_after(self):
        self.assertIsInstance(self.report["feedback_loss_after"],float)

    def test_loss_delta(self):
        self.assertAlmostEqual(self.report["feedback_loss_delta"],
                               round(self.report["feedback_loss_after"]-self.report["feedback_loss_before"],8))

    def test_both_benchmarks(self):
        self.assertEqual(set(self.report["benchmarks"]),{"written-v4","written-v5"})

    def test_real_case_counts(self):
        self.assertTrue(all(row["cases"]==1 for row in self.report["benchmarks"].values()))

    def test_review_is_explicit(self):
        self.assertIs(type(self.report["candidate_eligible_for_review"]),bool)

    def test_human_release(self):
        self.assertTrue(self.report["human_release_required"])

    def test_no_deployment(self):
        self.assertFalse(self.report["production_deployed"])
