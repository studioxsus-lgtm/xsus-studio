import json
import unittest
from languages.en.evaluation.adversarial_matrix_v6 import (
    ADVERSARIAL_MATRIX_V6, evaluate_adversarial_matrix_v6,
)
from languages.en.evaluation.mention_stress_v6 import StressCaseV6


class AdversarialMatrixV6Tests(unittest.TestCase):
    def test_ten_cases(self):
        self.assertEqual(evaluate_adversarial_matrix_v6()["cases"], 10)

    def test_four_methods(self):
        self.assertEqual(len(evaluate_adversarial_matrix_v6()["metrics"]), 4)

    def test_over_suppression_contrast_reported(self):
        r = evaluate_adversarial_matrix_v6()
        self.assertGreater(r["metrics"]["indirect"]["contrast"]["fn"], 0)

    def test_over_suppression_reference_reported(self):
        r = evaluate_adversarial_matrix_v6()
        self.assertGreater(r["metrics"]["indirect"]["reference"]["fn"], 0)

    def test_unhandled_mentions_contrast_reported(self):
        r = evaluate_adversarial_matrix_v6()
        self.assertGreater(r["metrics"]["indirect"]["contrast"]["fp"], 0)

    def test_unhandled_mentions_reference_reported(self):
        r = evaluate_adversarial_matrix_v6()
        self.assertGreater(r["metrics"]["indirect"]["reference"]["fp"], 0)

    def test_known_errors_match_matrix(self):
        r = evaluate_adversarial_matrix_v6()
        for field in ("contrast", "reference"):
            m = r["metrics"]["indirect"][field]
            self.assertEqual(r["known_residual_errors"][field], m["fp"] + m["fn"])

    def test_regression_recorded(self):
        r = evaluate_adversarial_matrix_v6()
        self.assertTrue(r["transitions"][-1]["regressions"])

    def test_no_release_gate_claim(self):
        r = evaluate_adversarial_matrix_v6()
        self.assertFalse(r["release_gate_passed"])
        self.assertFalse(r["release_gate_evaluated"])

    def test_nonrepresentative(self):
        self.assertFalse(evaluate_adversarial_matrix_v6()["adversarial_cases_are_representative"])

    def test_json(self):
        json.dumps(evaluate_adversarial_matrix_v6())

    def test_deterministic(self):
        self.assertEqual(evaluate_adversarial_matrix_v6(), evaluate_adversarial_matrix_v6())

    def test_duplicate_rejected(self):
        with self.assertRaises(ValueError):
            evaluate_adversarial_matrix_v6((ADVERSARIAL_MATRIX_V6[0], ADVERSARIAL_MATRIX_V6[0]))

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            evaluate_adversarial_matrix_v6(())

    def test_invalid_label_rejected(self):
        with self.assertRaises(ValueError):
            evaluate_adversarial_matrix_v6((StressCaseV6("bad", "Birds migrate.", 1, False, "control"),))

    def test_custom_control(self):
        r = evaluate_adversarial_matrix_v6((StressCaseV6("plain", "Birds migrate.", False, False, "control"),))
        self.assertEqual(r["known_residual_errors"], {"contrast": 0, "reference": 0})
