"""Milestone acceptance must be evidence-based and non-production."""
import unittest
from unittest.mock import patch

from languages.en.evaluation.word_sense_phase1_acceptance_v1 import phase1_acceptance


class Phase1AcceptanceTests(unittest.TestCase):
    def test_acceptance_checks_are_explicit(self):
        report = phase1_acceptance()
        self.assertEqual(report["contract"], "future-xsus-core.word-sense-phase1-acceptance.v1")
        self.assertEqual(report["phase"], "1-lexical-word-sense")
        self.assertEqual(report["supported_targets"], 14)
        self.assertEqual(report["baseline_cases"], 63)
        self.assertEqual(report["challenge_cases"], 48)
        self.assertTrue(report["passed"])
        self.assertEqual(report["status"], "experimental_milestone_complete")

    def test_no_production_or_open_domain_claim(self):
        report = phase1_acceptance()
        self.assertFalse(report["production_authorized"])
        self.assertFalse(report["open_domain_understanding_proven"])
        self.assertFalse(report["independent_external_holdout_proven"])
        self.assertFalse(report["raw_text_exposed"])

    def test_diagnostic_quality_failure_prevents_acceptance(self):
        with patch("languages.en.evaluation.word_sense_phase1_acceptance_v1.check_word_sense_quality",
                   return_value={"passed": False}):
            report = phase1_acceptance()
        self.assertFalse(report["passed"])
        self.assertEqual(report["status"], "incomplete")

    def test_missing_challenge_prevents_acceptance(self):
        from languages.en.evaluation.word_sense_challenge_report_v1 import evaluate_challenge
        challenge = evaluate_challenge()
        challenge["cases"] = 1
        with patch("languages.en.evaluation.word_sense_phase1_acceptance_v1.evaluate_challenge",
                   return_value=challenge):
            report = phase1_acceptance()
        self.assertFalse(report["passed"])

    def test_guard_regression_prevents_acceptance(self):
        from languages.en.evaluation.word_sense_guard_comparison_v1 import compare_all
        comparison = compare_all()
        comparison["baseline"]["guarded_wrong"] = comparison["baseline"]["baseline_wrong"] + 1
        with patch("languages.en.evaluation.word_sense_phase1_acceptance_v1.compare_all",
                   return_value=comparison):
            report = phase1_acceptance()
        self.assertFalse(report["passed"])

    def test_report_does_not_contain_source_sentences(self):
        report = phase1_acceptance()
        self.assertNotIn("The bank approved", repr(report))
        self.assertNotIn("The python is a snake", repr(report))


if __name__ == "__main__":
    unittest.main()
