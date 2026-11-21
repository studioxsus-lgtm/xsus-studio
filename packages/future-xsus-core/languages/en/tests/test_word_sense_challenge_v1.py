"""Check adversarial challenge integrity without asserting inflated performance."""
import unittest

from languages.en.evaluation.word_sense_challenge_report_v1 import evaluate_challenge


class WordSenseChallengeTests(unittest.TestCase):
    def test_challenge_is_nontrivial(self):
        report = evaluate_challenge()
        self.assertEqual(report["cases"], 48)
        self.assertGreater(report["correct_senses"], 0)
        self.assertGreater(len(report["per_target"]), 10)

    def test_challenge_counts_are_consistent(self):
        report = evaluate_challenge()
        totals = {key: sum(group[key] for group in report["per_target"].values())
                  for key in ("cases", "correct", "wrong", "missed", "true_abstentions", "false_resolutions")}
        self.assertEqual(totals["cases"], report["cases"])
        self.assertEqual(totals["correct"], report["correct_senses"])
        self.assertEqual(totals["wrong"], report["wrong_senses"])
        self.assertEqual(totals["missed"], report["missed_senses"])
        self.assertEqual(totals["true_abstentions"], report["true_abstentions"])
        self.assertEqual(totals["false_resolutions"], report["false_resolutions"])

    def test_no_false_release_claims(self):
        report = evaluate_challenge()
        self.assertFalse(report["production_authorized"])
        self.assertFalse(report["independent_external_holdout_proven"])
        self.assertFalse(report["raw_text_exposed"])

    def test_no_raw_case_text(self):
        report = evaluate_challenge()
        self.assertNotIn("She visited the bank", repr(report))
        self.assertNotIn("The python is a snake", repr(report))


if __name__ == "__main__":
    unittest.main()
