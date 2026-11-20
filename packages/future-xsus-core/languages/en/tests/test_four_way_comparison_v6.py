import json
import unittest
from languages.en.evaluation.mention_stress_v6 import StressCaseV6
from languages.en.evaluation.four_way_comparison_v6 import compare_four_filters_v6


class FourWayComparisonV6Tests(unittest.TestCase):
    def test_default_case_count(self):
        self.assertEqual(compare_four_filters_v6()["cases"], 12)

    def test_all_four_methods(self):
        self.assertEqual(set(compare_four_filters_v6()["metrics"]),
                         {"baseline", "mention", "quotation", "indirect"})

    def test_three_transitions(self):
        self.assertEqual(len(compare_four_filters_v6()["transitions"]), 3)

    def test_first_transition(self):
        self.assertEqual(compare_four_filters_v6()["transitions"][0]["to"], "mention")

    def test_final_transition(self):
        self.assertEqual(compare_four_filters_v6()["transitions"][-1]["to"], "indirect")

    def test_indirect_fixes_paraphrase_contrast(self):
        result = compare_four_filters_v6()
        self.assertGreater(result["transitions"][-1]["false_positive_reduction"]["contrast"], 0)

    def test_indirect_preserves_true_contrast(self):
        self.assertGreater(compare_four_filters_v6()["metrics"]["indirect"]["contrast"]["tp"], 0)

    def test_indirect_preserves_true_reference(self):
        self.assertGreater(compare_four_filters_v6()["metrics"]["indirect"]["reference"]["tp"], 0)

    def test_no_new_false_negatives_on_default_cases(self):
        for transition in compare_four_filters_v6()["transitions"]:
            self.assertEqual(transition["new_false_negatives"], {"contrast": 0, "reference": 0})

    def test_default_no_regressions(self):
        for transition in compare_four_filters_v6()["transitions"]:
            self.assertEqual(transition["regressions"], [])

    def test_metrics_sum_to_cases(self):
        result = compare_four_filters_v6()
        for method in result["metrics"].values():
            for scores in method.values():
                self.assertEqual(sum(scores[k] for k in ("tp", "tn", "fp", "fn")), 12)

    def test_json_serializable(self):
        json.dumps(compare_four_filters_v6())

    def test_deterministic(self):
        self.assertEqual(compare_four_filters_v6(), compare_four_filters_v6())

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            compare_four_filters_v6(())

    def test_invalid_type_rejected(self):
        with self.assertRaises(ValueError):
            compare_four_filters_v6(("bad",))

    def test_duplicate_rejected(self):
        case = StressCaseV6("dup", "Birds migrate.", False, False, "control")
        with self.assertRaises(ValueError):
            compare_four_filters_v6((case, case))

    def test_invalid_boolean_rejected(self):
        case = StressCaseV6("bad", "Birds migrate.", 1, False, "control")
        with self.assertRaises(ValueError):
            compare_four_filters_v6((case,))

    def test_regression_reporting(self):
        case = StressCaseV6("adversarial", "A teacher mentioned however in class.",
                            True, False, "adversarial")
        result = compare_four_filters_v6((case,))
        self.assertEqual(result["transitions"][-1]["regressions"][0]["case"], "adversarial")

    def test_no_generalization_claim(self):
        self.assertFalse(compare_four_filters_v6()["representative_accuracy_claim"])

    def test_production_disabled(self):
        self.assertFalse(compare_four_filters_v6()["production_filter_enabled"])
