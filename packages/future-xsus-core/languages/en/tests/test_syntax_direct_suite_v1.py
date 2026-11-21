import unittest
from dataclasses import replace
from languages.en.evaluation.syntax_direct_suite_v1 import (
    SyntaxProbeV1, ENGLISH_SYNTAX_DIRECT_SUITE_V1 as CASES,
    evaluate_syntax_direct_suite_v1 as evaluate,
)


class SyntaxDirectSuiteV1Tests(unittest.TestCase):
    def test_twelve_cases(self):
        self.assertEqual(evaluate()["case_count"],12)

    def test_three_phenomena(self):
        self.assertEqual(len(evaluate()["phenomena"]),3)

    def test_reference_pass(self):
        self.assertTrue(evaluate()["passed"])

    def test_all_cases_correct(self):
        self.assertEqual(evaluate()["correct_count"],12)

    def test_four_cases_per_phenomenon(self):
        self.assertTrue(all(x["count"]==4 for x in evaluate()["phenomena"].values()))

    def test_declaratives(self):
        self.assertTrue(evaluate()["phenomena"]["declarative"]["passed"])

    def test_imperatives(self):
        self.assertTrue(evaluate()["phenomena"]["imperative"]["passed"])

    def test_invalid_inputs(self):
        self.assertTrue(evaluate()["phenomena"]["invalid_input"]["passed"])

    def test_strict_case_count(self):
        self.assertFalse(evaluate(min_cases_per_phenomenon=5)["passed"])

    def test_wrong_label_detected(self):
        probes=list(CASES)
        probes[0]=replace(probes[0],expected_parseable=False)
        self.assertFalse(evaluate(probes)["passed"])

    def test_duplicate_case_rejected(self):
        with self.assertRaises(ValueError):
            evaluate([CASES[0]]*2)

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            evaluate([])

    def test_boolean_threshold_rejected(self):
        with self.assertRaises(ValueError):
            evaluate(min_cases_per_phenomenon=True)

    def test_bad_accuracy_rejected(self):
        with self.assertRaises(ValueError):
            evaluate(min_accuracy_per_phenomenon=1.1)

    def test_bad_probe_rejected(self):
        with self.assertRaises(ValueError):
            evaluate([SyntaxProbeV1("a","Hi",1,"invalid")])

    def test_no_release(self):
        self.assertFalse(evaluate()["release_authorized"])

    def test_not_independent_holdout(self):
        self.assertFalse(evaluate()["independent_holdout_proven"])

    def test_not_full_grammar(self):
        self.assertFalse(evaluate()["full_grammar_correctness_tested"])
