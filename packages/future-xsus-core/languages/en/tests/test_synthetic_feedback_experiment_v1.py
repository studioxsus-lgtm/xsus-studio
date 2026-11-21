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
        self.assertTrue(all(row["cases"]==10 for row in self.report["benchmarks"].values()))

    def test_review_is_explicit(self):
        self.assertIs(type(self.report["candidate_eligible_for_review"]),bool)

    def test_human_release(self):
        self.assertTrue(self.report["human_release_required"])

    def test_no_deployment(self):
        self.assertFalse(self.report["production_deployed"])

    def test_holdout_case_count(self):
        self.assertEqual(self.report["holdout_cases"],20)

    def test_holdout_counts_consistent(self):
        rows=self.report["benchmarks"].values()
        self.assertEqual(self.report["holdout_baseline_accepted"],
                         sum(row["baseline_accepted"] for row in rows))
        self.assertEqual(self.report["holdout_candidate_accepted"],
                         sum(row["candidate_accepted"] for row in rows))

    def test_holdout_delta_consistent(self):
        self.assertEqual(self.report["holdout_acceptance_delta"],
                         self.report["holdout_candidate_accepted"]-
                         self.report["holdout_baseline_accepted"])

    def test_generalization_gain_is_observed_not_assumed(self):
        self.assertEqual(self.report["observed_generalization_gain"],
                         self.report["holdout_acceptance_delta"]>0)

    def test_feedback_loss_improvement_is_measured(self):
        self.assertEqual(self.report["feedback_loss_improved"],
                         self.report["feedback_loss_after"]<self.report["feedback_loss_before"])

    def test_loss_alone_never_proves_release_readiness(self):
        self.assertFalse(self.report["release_evidence_sufficient"])

    def test_holdout_baseline_bounded(self):
        self.assertGreaterEqual(self.report["holdout_baseline_accepted"],0)
        self.assertLessEqual(self.report["holdout_baseline_accepted"],20)

    def test_holdout_candidate_bounded(self):
        self.assertGreaterEqual(self.report["holdout_candidate_accepted"],0)
        self.assertLessEqual(self.report["holdout_candidate_accepted"],20)

    def test_each_holdout_has_ten_cases(self):
        self.assertEqual([row["cases"] for row in self.report["benchmarks"].values()],[10,10])

    def test_no_unverified_quality_claim_after_expansion(self):
        self.assertFalse(self.report["release_evidence_sufficient"])
