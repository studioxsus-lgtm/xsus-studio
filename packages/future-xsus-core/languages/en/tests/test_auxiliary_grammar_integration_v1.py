import unittest
from dataclasses import replace
from languages.en.evaluation.auxiliary_grammar_integration_v1 import (
    AuxiliaryGrammarProbeV1, ENGLISH_AUXILIARY_GRAMMAR_PROBES_V1 as CASES,
    evaluate_auxiliary_grammar_integration_v1 as evaluate,
)


class AuxiliaryGrammarIntegrationV1Tests(unittest.TestCase):
    def test_eight_cases(self):
        self.assertEqual(evaluate()["case_count"],8)

    def test_two_phenomena(self):
        self.assertEqual(len(evaluate()["phenomena"]),2)

    def test_reference_passes(self):
        self.assertTrue(evaluate()["passed"])

    def test_all_correct(self):
        self.assertEqual(evaluate()["correct_count"],8)

    def test_questions(self):
        self.assertTrue(evaluate()["phenomena"]["question"]["passed"])

    def test_negations(self):
        self.assertTrue(evaluate()["phenomena"]["negation"]["passed"])

    def test_question_correction(self):
        self.assertEqual(evaluate()["results"][1]["observed_suggestion"],"read")

    def test_negation_correction(self):
        self.assertEqual(evaluate()["results"][5]["observed_suggestion"],"read")

    def test_valid_question_no_issue(self):
        self.assertIsNone(evaluate()["results"][0]["observed_issue"])

    def test_valid_negation_no_issue(self):
        self.assertIsNone(evaluate()["results"][4]["observed_issue"])

    def test_wrong_label_fails(self):
        probes=list(CASES)
        probes[0]=replace(probes[0],expected_issue="auxiliary_verb_form")
        self.assertFalse(evaluate(probes)["passed"])

    def test_duplicate_rejected(self):
        with self.assertRaises(ValueError):
            evaluate([CASES[0]]*2)

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            evaluate([])

    def test_bad_threshold(self):
        with self.assertRaises(ValueError):
            evaluate(min_accuracy_per_phenomenon=2)

    def test_boolean_threshold(self):
        with self.assertRaises(ValueError):
            evaluate(min_cases_per_phenomenon=True)

    def test_min_cases_gate(self):
        self.assertFalse(evaluate(min_cases_per_phenomenon=5)["passed"])

    def test_invalid_phenomenon(self):
        with self.assertRaises(ValueError):
            evaluate([AuxiliaryGrammarProbeV1("a","Does she read the report?","other",None,None)])

    def test_no_release(self):
        self.assertFalse(evaluate()["release_authorized"])

    def test_no_independent_holdout(self):
        self.assertFalse(evaluate()["independent_holdout_proven"])

    def test_direct_integration(self):
        self.assertTrue(evaluate()["syntax_and_grammar_called_directly"])
