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

    def test_quality_gate_requires_measured_gain(self):
        self.assertEqual(self.report["candidate_quality_gate_passed"],
                         not self.report["generation_collapse_detected"] and
                         self.report["observed_generalization_gain"] and
                         all(row["candidate_accepted"]>=row["baseline_accepted"]
                             for row in self.report["benchmarks"].values()))

    def test_quality_gate_reasons_are_explainable(self):
        self.assertIsInstance(self.report["quality_gate_reasons"],list)

    def test_no_gain_reason_is_explicit(self):
        if self.report["holdout_acceptance_delta"]<=0:
            self.assertIn("no_holdout_acceptance_gain",self.report["quality_gate_reasons"])

    def test_review_eligibility_does_not_override_quality_gate(self):
        if not self.report["candidate_quality_gate_passed"]:
            self.assertFalse(self.report["release_evidence_sufficient"])

    def test_generation_diagnostics_for_each_checkpoint(self):
        for row in self.report["benchmarks"].values():
            self.assertEqual(row["baseline_generation_diagnostics"]["cases"],10)
            self.assertEqual(row["candidate_generation_diagnostics"]["cases"],10)

    def test_generation_diagnostics_have_no_raw_text(self):
        for row in self.report["benchmarks"].values():
            self.assertFalse(row["baseline_generation_diagnostics"]["contains_generated_text"])
            self.assertFalse(row["candidate_generation_diagnostics"]["contains_generated_text"])

    def test_generation_diagnostics_scores_agree(self):
        for row in self.report["benchmarks"].values():
            self.assertEqual(row["baseline_generation_diagnostics"]["accepted"],row["baseline_accepted"])
            self.assertEqual(row["candidate_generation_diagnostics"]["accepted"],row["candidate_accepted"])

    def test_collapse_flag_is_boolean(self):
        self.assertIs(type(self.report["generation_collapse_detected"]),bool)

    def test_empty_response_regression_is_detected(self):
        has_empty_regression=any(
            row["candidate_generation_diagnostics"]["empty_responses"] >
            row["baseline_generation_diagnostics"]["empty_responses"]
            for row in self.report["benchmarks"].values())
        if has_empty_regression:
            self.assertTrue(self.report["generation_collapse_detected"])

    def test_collapsed_candidate_never_passes_quality_gate(self):
        if self.report["generation_collapse_detected"]:
            self.assertFalse(self.report["candidate_quality_gate_passed"])

    def test_collapsed_candidate_not_safe_for_review(self):
        if self.report["generation_collapse_detected"]:
            self.assertFalse(self.report["candidate_safe_for_review"])

    def test_collapse_reason_exposed(self):
        if self.report["generation_collapse_detected"]:
            self.assertIn("generation_collapse_detected",self.report["quality_gate_reasons"])

    def test_review_safety_requires_gain(self):
        self.assertEqual(self.report["candidate_safe_for_review"],
                         not self.report["generation_collapse_detected"] and
                         self.report["observed_generalization_gain"])

    def test_minimum_length_diagnostics_present(self):
        for row in self.report["benchmarks"].values():
            self.assertEqual(row["candidate_min_length_8_diagnostics"]["cases"],10)

    def test_minimum_length_diagnostics_privacy(self):
        for row in self.report["benchmarks"].values():
            self.assertFalse(row["candidate_min_length_8_diagnostics"]["contains_generated_text"])

    def test_minimum_length_not_automatically_approved(self):
        self.assertFalse(self.report["release_evidence_sufficient"])

    def test_minimum_visible_diagnostics_present(self):
        for row in self.report["benchmarks"].values():
            self.assertEqual(row["candidate_min_visible_8_diagnostics"]["cases"],10)

    def test_minimum_visible_diagnostics_privacy(self):
        for row in self.report["benchmarks"].values():
            self.assertFalse(row["candidate_min_visible_8_diagnostics"]["contains_generated_text"])

    def test_visible_arm_does_not_authorize_release(self):
        self.assertFalse(self.report["release_evidence_sufficient"])

    def test_token_choice_diagnostics_cover_320_steps(self):
        for row in self.report["benchmarks"].values():
            diagnostic=row["candidate_token_choice_diagnostics"]
            self.assertEqual(diagnostic["cases"],10)
            self.assertEqual(diagnostic["steps_per_case"],32)
            self.assertEqual(sum(diagnostic[key] for key in (
                "whitespace_token_steps","printable_token_steps",
                "non_rendering_token_steps","control_or_replacement_token_steps")),320)

    def test_token_choice_diagnostics_do_not_expose_raw_text(self):
        for row in self.report["benchmarks"].values():
            diagnostic=row["candidate_token_choice_diagnostics"]
            self.assertFalse(diagnostic["raw_text_exposed"])
            self.assertFalse(diagnostic["raw_token_ids_exposed"])

    def test_visible_first_diagnostics_present(self):
        for row in self.report["benchmarks"].values():
            self.assertEqual(row["candidate_visible_first_diagnostics"]["cases"],10)

    def test_visible_first_diagnostics_privacy(self):
        for row in self.report["benchmarks"].values():
            self.assertFalse(row["candidate_visible_first_diagnostics"]["contains_generated_text"])

    def test_visible_first_does_not_automatically_release(self):
        self.assertFalse(self.report["release_evidence_sufficient"])
