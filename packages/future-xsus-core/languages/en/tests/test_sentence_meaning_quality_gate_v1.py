"""Phase 2 gate contract tests."""
import unittest
from unittest.mock import patch

from languages.en.evaluation.sentence_meaning_quality_gate_v1 import phase2_quality_report


class Phase2QualityTests(unittest.TestCase):
    def test_both_datasets_pass_bounded_gate(self):
        report = phase2_quality_report()
        self.assertTrue(report["passed"])
        self.assertEqual(report["baseline"]["cases"], 32)
        self.assertEqual(report["challenge"]["cases"], 24)

    def test_no_production_or_external_claim(self):
        report = phase2_quality_report()
        self.assertFalse(report["production_authorized"])
        self.assertFalse(report["independent_external_holdout_proven"])
        self.assertFalse(report["open_domain_understanding_proven"])

    def test_wrong_challenge_frame_fails_closed(self):
        from languages.en.evaluation.sentence_meaning_benchmark_v1 import evaluate_sentence_frames
        baseline = evaluate_sentence_frames()
        challenge = evaluate_sentence_frames()
        challenge["wrong_frames"] = 1
        challenge["correct_frames"] -= 1
        with patch("languages.en.evaluation.sentence_meaning_quality_gate_v1.evaluate_sentence_frames",
                   side_effect=[baseline, challenge]):
            report = phase2_quality_report()
        self.assertFalse(report["passed"])

    def test_empty_challenge_fails_closed(self):
        from languages.en.evaluation.sentence_meaning_benchmark_v1 import evaluate_sentence_frames
        baseline = evaluate_sentence_frames()
        challenge = evaluate_sentence_frames()
        challenge["cases"] = 0
        with patch("languages.en.evaluation.sentence_meaning_quality_gate_v1.evaluate_sentence_frames",
                   side_effect=[baseline, challenge]):
            report = phase2_quality_report()
        self.assertFalse(report["passed"])


if __name__ == "__main__":
    unittest.main()
