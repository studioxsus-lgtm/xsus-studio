import unittest
from dataclasses import replace
from languages.en.evaluation.morphology_holdout_v1 import MorphologyCaseV1
from languages.en.evaluation.morphology_direct_suite_v1 import (
    MorphologyPhenomenonV1 as Item,
    ENGLISH_MORPHOLOGY_DIRECT_SUITE_V1 as CASES,
    evaluate_morphology_direct_suite_v1 as evaluate,
)


class MorphologyDirectSuiteV1Tests(unittest.TestCase):
    def test_twenty_cases(self):
        self.assertEqual(evaluate()["case_count"],20)

    def test_five_phenomena(self):
        self.assertEqual(len(evaluate()["phenomena"]),5)

    def test_reference_passes(self):
        self.assertTrue(evaluate()["passed"])

    def test_full_accuracy_on_fixture(self):
        self.assertEqual(evaluate()["accuracy"],1.0)

    def test_four_cases_each(self):
        self.assertTrue(all(x["count"]==4 for x in evaluate()["phenomena"].values()))

    def test_irregular_verbs(self):
        self.assertEqual(evaluate()["phenomena"]["irregular_verbs"]["correct"],4)

    def test_regular_verbs(self):
        self.assertEqual(evaluate()["phenomena"]["regular_verbs"]["correct"],4)

    def test_spelling(self):
        self.assertEqual(evaluate()["phenomena"]["verb_spelling"]["correct"],4)

    def test_irregular_nouns(self):
        self.assertEqual(evaluate()["phenomena"]["irregular_nouns"]["correct"],4)

    def test_regular_nouns(self):
        self.assertEqual(evaluate()["phenomena"]["regular_nouns"]["correct"],4)

    def test_stricter_case_threshold(self):
        self.assertFalse(evaluate(min_cases_per_phenomenon=5)["passed"])

    def test_incorrect_reference_detected(self):
        cases=list(CASES)
        cases[0]=replace(cases[0],case=replace(cases[0].case,expected="goed"))
        self.assertFalse(evaluate(cases)["passed"])

    def test_duplicate_case_rejected(self):
        with self.assertRaises(ValueError):
            evaluate([CASES[0]]*2)

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            evaluate([])

    def test_bad_threshold_rejected(self):
        with self.assertRaises(ValueError):
            evaluate(min_accuracy_per_phenomenon=2)

    def test_boolean_threshold_rejected(self):
        with self.assertRaises(ValueError):
            evaluate(min_cases_per_phenomenon=True)

    def test_invalid_phenomenon_rejected(self):
        with self.assertRaises(ValueError):
            evaluate([Item(CASES[0].case,"")])

    def test_regression_detected(self):
        baseline={item.case.case_id:item.case.expected for item in CASES}
        cases=list(CASES)
        cases[0]=replace(cases[0],case=replace(cases[0].case,expected="goed"))
        report=evaluate(cases,baseline_predictions=baseline)
        self.assertEqual(report["regressions"],[])

    def test_no_release(self):
        self.assertFalse(evaluate()["release_authorized"])

    def test_not_independent_holdout(self):
        self.assertFalse(evaluate()["independent_holdout_proven"])
