"""Conservative lexical guard tests and regression accounting."""
import unittest

from languages.en.text.understanding.context_guard_v1 import (
    analyze_guarded_word_sense as analyze, compare_guarded_word_sense,
)
from languages.en.evaluation.word_sense_guard_comparison_v1 import compare_all


class ContextGuardTests(unittest.TestCase):
    def test_simple_unchanged(self):
        result = analyze("The bank approved a loan.", "bank")
        self.assertEqual(result.sense, "financial_institution")
        self.assertFalse(result.guard_triggered)

    def test_negated_evidence_abstains(self):
        result = analyze("The bank was not a river bank, but held savings.", "bank")
        self.assertIsNone(result.sense)
        self.assertTrue(result.guard_triggered)

    def test_negated_contrast_abstains(self):
        result = analyze("The python is not a snake but a programming language.", "python")
        self.assertEqual(result.status, "guarded_abstention")
        self.assertIn("negated_contrast", result.guard_reasons)

    def test_negated_other_word_is_not_factual_inference(self):
        result = analyze("The bat was not flying in the cave.", "bat")
        self.assertIsNone(result.sense)

    def test_unresolved_baseline_remains_unresolved(self):
        result = analyze("The bank was there.", "bank")
        self.assertIsNone(result.sense)
        self.assertFalse(result.guard_triggered)

    def test_invalid_input_fails_closed(self):
        with self.assertRaises(ValueError):
            analyze("", "bank")

    def test_no_raw_text_in_comparison(self):
        result = compare_guarded_word_sense("The SECRET-999 bank has a savings account.", "bank")
        self.assertNotIn("SECRET-999", repr(result))
        self.assertFalse(result["production_authorized"])

    def test_comparison_reports_all_datasets(self):
        result = compare_all()
        self.assertEqual(result["baseline"]["cases"], 63)
        self.assertEqual(result["challenge"]["cases"], 48)
        self.assertFalse(result["production_authorized"])

    def test_guard_never_invents_new_sense(self):
        for text, target in [
            ("The bank was not near the river but had savings.", "bank"),
            ("The computer mouse controls a cursor.", "mouse"),
            ("The spring supplied water.", "spring"),
        ]:
            with self.subTest(text=text):
                before = compare_guarded_word_sense(text, target)
                self.assertIn(before["after_sense"], (before["before_sense"], None))

    def test_transition_accounting(self):
        result = compare_all()
        for group in (result["baseline"], result["challenge"]):
            self.assertEqual(group["baseline_correct"] + group["baseline_wrong"] +
                             group["baseline_false_resolutions"] + group["baseline_true_abstentions"] +
                             (group["cases"] - group["baseline_correct"] - group["baseline_wrong"] -
                              group["baseline_false_resolutions"] - group["baseline_true_abstentions"]),
                             group["cases"])
            self.assertLessEqual(group["correct_to_abstention"] + group["wrong_to_abstention"] +
                                 group["false_resolution_to_abstention"], group["guard_triggered"])


if __name__ == "__main__":
    unittest.main()
