import unittest
from dataclasses import replace
from languages.en.evaluation.syntax_grammar_integration_v1 import (
    SentenceGrammarProbeV1, ENGLISH_SENTENCE_GRAMMAR_PROBES_V1 as CASES,
    evaluate_syntax_grammar_integration_v1 as evaluate,
)


class SyntaxGrammarIntegrationV1Tests(unittest.TestCase):
    def test_eight_cases(self):
        self.assertEqual(evaluate()["case_count"],8)

    def test_full_accuracy(self):
        self.assertEqual(evaluate()["accuracy"],1.0)

    def test_pass(self):
        self.assertTrue(evaluate()["passed"])

    def test_correct_count(self):
        self.assertEqual(evaluate()["correct_count"],8)

    def test_parsed(self):
        self.assertTrue(all(r["parsed"] for r in evaluate()["results"]))

    def test_singular_correction(self):
        self.assertEqual(evaluate()["results"][1]["observed_suggestion"],"writes")

    def test_plural_correction(self):
        self.assertEqual(evaluate()["results"][3]["observed_suggestion"],"read")

    def test_correct_sentence_no_issue(self):
        self.assertIsNone(evaluate()["results"][0]["observed_issue"])

    def test_wrong_label_fails(self):
        cases=list(CASES)
        cases[0]=replace(cases[0],expected_issue="subject_verb_agreement")
        self.assertFalse(evaluate(cases)["passed"])

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            evaluate([])

    def test_duplicate_rejected(self):
        with self.assertRaises(ValueError):
            evaluate([CASES[0]]*2)

    def test_bad_threshold(self):
        with self.assertRaises(ValueError):
            evaluate(min_accuracy=2)

    def test_boolean_threshold(self):
        with self.assertRaises(ValueError):
            evaluate(min_cases=True)

    def test_minimum_cases(self):
        self.assertFalse(evaluate(min_cases=9)["passed"])

    def test_invalid_probe(self):
        with self.assertRaises(ValueError):
            evaluate([SentenceGrammarProbeV1("a",123,None,None)])

    def test_no_release(self):
        self.assertFalse(evaluate()["release_authorized"])

    def test_no_blind_holdout(self):
        self.assertFalse(evaluate()["independent_holdout_proven"])

    def test_integration_flag(self):
        self.assertTrue(evaluate()["syntax_and_grammar_called_directly"])
