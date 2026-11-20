import json
import unittest
from languages.en.evaluation.mention_stress_v6 import StressCaseV6
from languages.en.evaluation.quotation_comparison_v6 import compare_quotation_filters_v6


class QuotationComparisonV6Tests(unittest.TestCase):
    def test_default_cases(self):
        self.assertEqual(compare_quotation_filters_v6()["cases"], 12)

    def test_three_methods(self):
        self.assertEqual(set(compare_quotation_filters_v6()["metrics"]),
                         {"baseline", "mention", "quotation"})

    def test_baseline_has_false_positives(self):
        r = compare_quotation_filters_v6()
        self.assertGreater(r["metrics"]["baseline"]["contrast"]["fp"], 0)

    def test_quotation_improves_contrast_fp(self):
        r = compare_quotation_filters_v6()
        self.assertGreater(r["mention_to_quotation_fp_reduction"]["contrast"], 0)

    def test_quotation_improves_reference_fp(self):
        r = compare_quotation_filters_v6()
        self.assertGreater(r["mention_to_quotation_fp_reduction"]["reference"], 0)

    def test_no_new_false_negatives_in_fixture(self):
        r = compare_quotation_filters_v6()
        self.assertEqual(r["mention_to_quotation_fn_change"], {"contrast": 0, "reference": 0})

    def test_no_regressions_in_fixture(self):
        self.assertEqual(compare_quotation_filters_v6()["regressions"], [])

    def test_precision_defined_when_positive(self):
        r = compare_quotation_filters_v6()
        self.assertIsNotNone(r["metrics"]["quotation"]["contrast"]["precision"])

    def test_recall_defined_when_positive(self):
        r = compare_quotation_filters_v6()
        self.assertIsNotNone(r["metrics"]["quotation"]["reference"]["recall"])

    def test_paraphrase_limit_remains(self):
        r = compare_quotation_filters_v6()
        self.assertGreater(r["metrics"]["quotation"]["contrast"]["fp"], 0)

    def test_json_serializable(self):
        json.dumps(compare_quotation_filters_v6())

    def test_deterministic(self):
        self.assertEqual(compare_quotation_filters_v6(), compare_quotation_filters_v6())

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            compare_quotation_filters_v6(())

    def test_wrong_type_rejected(self):
        with self.assertRaises(ValueError):
            compare_quotation_filters_v6(("bad",))

    def test_duplicate_names_rejected(self):
        case = StressCaseV6("same", "Birds migrate.", False, False, "control")
        with self.assertRaises(ValueError):
            compare_quotation_filters_v6((case, case))

    def test_bad_boolean_label_rejected(self):
        case = StressCaseV6("bad", "Birds migrate.", 0, False, "control")
        with self.assertRaises(ValueError):
            compare_quotation_filters_v6((case,))

    def test_regression_is_reported(self):
        # Quoted cue is intentionally labeled as real use: a stricter
        # quotation filter must then report its newly introduced error.
        case = StressCaseV6("adversarial", 'He wrote "however".', True, False, "adversarial")
        r = compare_quotation_filters_v6((case,))
        self.assertEqual(r["regressions"][0]["case"], "adversarial")

    def test_undefined_precision_is_null(self):
        case = StressCaseV6("plain", "Birds migrate.", False, False, "control")
        self.assertIsNone(compare_quotation_filters_v6((case,))["metrics"]["quotation"]["contrast"]["precision"])

    def test_no_production_claim(self):
        self.assertFalse(compare_quotation_filters_v6()["production_filter_enabled"])

    def test_no_generalization_claim(self):
        self.assertFalse(compare_quotation_filters_v6()["representative_accuracy_claim"])
