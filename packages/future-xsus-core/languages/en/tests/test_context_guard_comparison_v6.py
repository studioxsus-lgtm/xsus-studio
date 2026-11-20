import json
import unittest
from languages.en.evaluation.context_guard_comparison_v6 import compare_context_guard_v6
from languages.en.evaluation.mention_stress_v6 import StressCaseV6


class ContextGuardComparisonV6Tests(unittest.TestCase):
    def test_default_ten_cases(self):
        self.assertEqual(compare_context_guard_v6()["cases"], 10)

    def test_five_methods(self):
        self.assertEqual(set(compare_context_guard_v6()["metrics"]),
                         {"baseline", "mention", "quotation", "indirect", "context_guard"})

    def test_context_guard_reduces_contrast_false_positives(self):
        r = compare_context_guard_v6()
        self.assertGreater(r["indirect_to_context_guard"]["false_positive_reduction"]["contrast"], 0)

    def test_context_guard_reduces_reference_false_positives(self):
        r = compare_context_guard_v6()
        self.assertGreater(r["indirect_to_context_guard"]["false_positive_reduction"]["reference"], 0)

    def test_context_guard_recovers_contrast_false_negative(self):
        r = compare_context_guard_v6()
        self.assertLess(r["indirect_to_context_guard"]["new_false_negatives"]["contrast"], 0)

    def test_context_guard_recovers_reference_false_negative(self):
        r = compare_context_guard_v6()
        self.assertLess(r["indirect_to_context_guard"]["new_false_negatives"]["reference"], 0)

    def test_no_default_regressions(self):
        self.assertEqual(compare_context_guard_v6()["indirect_to_context_guard"]["regressions"], [])

    def test_default_corrections_recorded(self):
        r = compare_context_guard_v6()
        self.assertTrue(r["indirect_to_context_guard"]["corrections"])

    def test_confusion_totals(self):
        r = compare_context_guard_v6()
        for scores in r["metrics"].values():
            for field in ("contrast", "reference"):
                self.assertEqual(sum(scores[field][k] for k in ("tp", "tn", "fp", "fn")), 10)

    def test_deterministic(self):
        self.assertEqual(compare_context_guard_v6(), compare_context_guard_v6())

    def test_json(self):
        json.dumps(compare_context_guard_v6())

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            compare_context_guard_v6(())

    def test_wrong_type_rejected(self):
        with self.assertRaises(ValueError):
            compare_context_guard_v6(("bad",))

    def test_duplicate_rejected(self):
        case = StressCaseV6("dup", "Birds migrate.", False, False, "control")
        with self.assertRaises(ValueError):
            compare_context_guard_v6((case, case))

    def test_invalid_label_rejected(self):
        case = StressCaseV6("bad", "Birds migrate.", 1, False, "control")
        with self.assertRaises(ValueError):
            compare_context_guard_v6((case,))

    def test_custom_plain(self):
        case = StressCaseV6("plain", "Birds migrate.", False, False, "control")
        r = compare_context_guard_v6((case,))
        self.assertEqual(r["metrics"]["context_guard"]["contrast"]["tn"], 1)

    def test_regression_visible_when_label_disagrees(self):
        case = StressCaseV6("adversarial", "The speaker mentioned she would return.",
                            False, False, "adversarial")
        r = compare_context_guard_v6((case,))
        self.assertIn("adversarial",
                      {x["case"] for x in r["indirect_to_context_guard"]["regressions"]})

    def test_no_production_activation(self):
        self.assertFalse(compare_context_guard_v6()["production_filter_enabled"])

    def test_no_general_accuracy_claim(self):
        self.assertFalse(compare_context_guard_v6()["representative_accuracy_claim"])
