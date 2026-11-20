import json
import unittest
from languages.en.evaluation.mention_stress_v6 import (
    STRESS_CASES_V6, StressCaseV6, evaluate_mention_stress_v6,
)


class MentionStressV6Tests(unittest.TestCase):
    def test_twelve_cases(self):
        self.assertEqual(evaluate_mention_stress_v6()["cases"], 12)

    def test_categories(self):
        self.assertEqual(set(evaluate_mention_stress_v6()["by_category"]),
                         {"control", "mention", "usage", "mixed", "quotation", "paraphrase"})

    def test_known_quotation_limitations_reported(self):
        failures = evaluate_mention_stress_v6()["failures"]
        self.assertIn("quoted_contrast", {f["case"] for f in failures})
        self.assertIn("quoted_reference", {f["case"] for f in failures})

    def test_known_paraphrase_limitations_reported(self):
        self.assertIn("other_mention",
                      {f["case"] for f in evaluate_mention_stress_v6()["failures"]})

    def test_literal_word_cases_pass(self):
        failures = {f["case"] for f in evaluate_mention_stress_v6()["failures"]}
        self.assertNotIn("literal_contrast", failures)
        self.assertNotIn("literal_reference", failures)

    def test_actual_usage_preserved(self):
        failures = {f["case"] for f in evaluate_mention_stress_v6()["failures"]}
        self.assertNotIn("real_contrast", failures)
        self.assertNotIn("real_reference", failures)

    def test_mixed_usage_preserved(self):
        failures = {f["case"] for f in evaluate_mention_stress_v6()["failures"]}
        self.assertNotIn("mixed_contrast", failures)
        self.assertNotIn("mixed_reference", failures)

    def test_accuracy_not_perfect(self):
        self.assertLess(evaluate_mention_stress_v6()["field_accuracy"], 1.0)

    def test_accuracy_bounded(self):
        score = evaluate_mention_stress_v6()["field_accuracy"]
        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 1)

    def test_category_accuracy(self):
        r = evaluate_mention_stress_v6()
        self.assertLess(r["by_category"]["quotation"]["accuracy"], 1.0)

    def test_failure_schema(self):
        for failure in evaluate_mention_stress_v6()["failures"]:
            self.assertEqual(set(failure), {"case", "category", "field", "expected", "actual"})

    def test_json_serializable(self):
        json.dumps(evaluate_mention_stress_v6())

    def test_deterministic(self):
        self.assertEqual(evaluate_mention_stress_v6(), evaluate_mention_stress_v6())

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            evaluate_mention_stress_v6(())

    def test_wrong_type_rejected(self):
        with self.assertRaises(ValueError):
            evaluate_mention_stress_v6(("bad",))

    def test_duplicate_name_rejected(self):
        with self.assertRaises(ValueError):
            evaluate_mention_stress_v6((STRESS_CASES_V6[0], STRESS_CASES_V6[0]))

    def test_invalid_boolean_rejected(self):
        with self.assertRaises(ValueError):
            evaluate_mention_stress_v6((StressCaseV6("bad", "Birds migrate.", 0, False, "control"),))

    def test_invalid_category_rejected(self):
        with self.assertRaises(ValueError):
            evaluate_mention_stress_v6((StressCaseV6("bad", "Birds migrate.", False, False, ""),))

    def test_custom_case(self):
        case = StressCaseV6("custom", "Birds migrate.", False, False, "control")
        self.assertEqual(evaluate_mention_stress_v6((case,))["field_accuracy"], 1.0)

    def test_no_generalization_claim(self):
        self.assertFalse(evaluate_mention_stress_v6()["represents_general_english"])
