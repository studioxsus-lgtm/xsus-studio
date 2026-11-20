import json
import unittest
from languages.en.evaluation.mention_comparison_v6 import (
    MentionCaseV6, MENTION_CASES_V6, compare_mention_filter_v6,
)


class MentionComparisonV6Tests(unittest.TestCase):
    def test_default_cases(self):
        self.assertEqual(compare_mention_filter_v6()["cases"], 7)

    def test_baseline_contrast_false_positive(self):
        self.assertEqual(compare_mention_filter_v6()["before"]["contrast"]["fp"], 1)

    def test_baseline_reference_false_positive(self):
        self.assertEqual(compare_mention_filter_v6()["before"]["reference"]["fp"], 1)

    def test_filter_removes_contrast_false_positive(self):
        self.assertEqual(compare_mention_filter_v6()["after"]["contrast"]["fp"], 0)

    def test_filter_removes_reference_false_positive(self):
        self.assertEqual(compare_mention_filter_v6()["after"]["reference"]["fp"], 0)

    def test_reduction_reported(self):
        self.assertEqual(compare_mention_filter_v6()["false_positive_reduction"],
                         {"contrast": 1, "reference": 1})

    def test_no_new_false_negatives(self):
        self.assertEqual(compare_mention_filter_v6()["new_false_negatives"],
                         {"contrast": 0, "reference": 0})

    def test_real_contrast_preserved(self):
        self.assertEqual(compare_mention_filter_v6()["after"]["contrast"]["tp"], 2)

    def test_real_reference_preserved(self):
        self.assertEqual(compare_mention_filter_v6()["after"]["reference"]["tp"], 2)

    def test_precision_improves(self):
        r = compare_mention_filter_v6()
        self.assertGreater(r["after"]["contrast"]["precision"],
                           r["before"]["contrast"]["precision"])

    def test_recall_preserved(self):
        r = compare_mention_filter_v6()
        self.assertEqual(r["before"]["reference"]["recall"],
                         r["after"]["reference"]["recall"])

    def test_json_serializable(self):
        json.dumps(compare_mention_filter_v6())

    def test_deterministic(self):
        self.assertEqual(compare_mention_filter_v6(), compare_mention_filter_v6())

    def test_no_production_activation(self):
        self.assertFalse(compare_mention_filter_v6()["production_filter_enabled"])

    def test_no_generalization_claim(self):
        self.assertFalse(compare_mention_filter_v6()["representative_accuracy_claim"])

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            compare_mention_filter_v6(())

    def test_invalid_type_rejected(self):
        with self.assertRaises(ValueError):
            compare_mention_filter_v6(("invalid",))

    def test_duplicate_name_rejected(self):
        with self.assertRaises(ValueError):
            compare_mention_filter_v6((MENTION_CASES_V6[0], MENTION_CASES_V6[0]))

    def test_bad_label_rejected(self):
        with self.assertRaises(ValueError):
            compare_mention_filter_v6((MentionCaseV6("bad", "Birds migrate.", 0, False),))

    def test_custom_case(self):
        case = MentionCaseV6("plain", "Birds migrate.", False, False)
        self.assertEqual(compare_mention_filter_v6((case,))["after"]["contrast"]["tn"], 1)

    def test_undefined_precision_null(self):
        case = MentionCaseV6("plain", "Birds migrate.", False, False)
        self.assertIsNone(compare_mention_filter_v6((case,))["after"]["contrast"]["precision"])
