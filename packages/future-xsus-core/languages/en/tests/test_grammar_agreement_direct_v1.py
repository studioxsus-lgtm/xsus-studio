import unittest
from dataclasses import replace
from languages.en.evaluation.grammar_agreement_direct_v1 import (
    GrammarAgreementProbeV1, ENGLISH_GRAMMAR_AGREEMENT_PROBES_V1 as CASES,
    evaluate_grammar_agreement_direct_v1 as evaluate,
)


class GrammarAgreementDirectV1Tests(unittest.TestCase):
    def test_twelve(self):
        self.assertEqual(evaluate()["case_count"],12)

    def test_all_correct(self):
        self.assertEqual(evaluate()["correct_count"],12)

    def test_pass(self):
        self.assertTrue(evaluate()["passed"])

    def test_accuracy(self):
        self.assertEqual(evaluate()["accuracy"],1.0)

    def test_singular(self):
        self.assertEqual(evaluate()["results"][1]["observed_suggestion"],"writes")

    def test_plural(self):
        self.assertEqual(evaluate()["results"][3]["observed_suggestion"],"read")

    def test_be_singular(self):
        self.assertEqual(evaluate()["results"][9]["observed_suggestion"],"is")

    def test_be_plural(self):
        self.assertEqual(evaluate()["results"][11]["observed_suggestion"],"are")

    def test_wrong_label_fails(self):
        cases=list(CASES)
        cases[0]=replace(cases[0],expected_issue="subject_verb_agreement")
        self.assertFalse(evaluate(cases)["passed"])

    def test_duplicate_rejected(self):
        with self.assertRaises(ValueError):
            evaluate([CASES[0]]*2)

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            evaluate([])

    def test_min_cases(self):
        self.assertFalse(evaluate(min_cases=13)["passed"])

    def test_bad_threshold(self):
        with self.assertRaises(ValueError):
            evaluate(min_accuracy=2)

    def test_boolean_threshold(self):
        with self.assertRaises(ValueError):
            evaluate(min_cases=True)

    def test_bad_verb(self):
        with self.assertRaises(ValueError):
            evaluate([replace(CASES[0],verb="xyz")])

    def test_no_release(self):
        self.assertFalse(evaluate()["release_authorized"])

    def test_not_end_to_end(self):
        self.assertFalse(evaluate()["syntax_parser_end_to_end_verified"])

    def test_not_blind_holdout(self):
        self.assertFalse(evaluate()["independent_holdout_proven"])
