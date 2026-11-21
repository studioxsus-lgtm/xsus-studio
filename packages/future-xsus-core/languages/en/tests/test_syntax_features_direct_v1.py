import unittest
from dataclasses import replace
from languages.en.evaluation.syntax_features_direct_v1 import (
    SyntaxFeatureProbeV1, ENGLISH_SYNTAX_FEATURE_PROBES_V1 as CASES,
    evaluate_syntax_features_direct_v1 as evaluate,
)


class SyntaxFeaturesDirectV1Tests(unittest.TestCase):
    def test_twelve_cases(self):
        self.assertEqual(evaluate()["case_count"],12)

    def test_three_features(self):
        self.assertEqual(len(evaluate()["features"]),3)

    def test_reference_pass(self):
        self.assertTrue(evaluate()["passed"])

    def test_full_fixture_correctness(self):
        self.assertEqual(evaluate()["correct_count"],12)

    def test_questions(self):
        self.assertTrue(evaluate()["features"]["kind"]["passed"])

    def test_negations(self):
        self.assertTrue(evaluate()["features"]["negated"]["passed"])

    def test_subjects(self):
        self.assertTrue(evaluate()["features"]["subject"]["passed"])

    def test_minimum_case_gate(self):
        self.assertFalse(evaluate(min_cases_per_feature=5)["passed"])

    def test_wrong_expected_detected(self):
        cases=list(CASES)
        cases[0]=replace(cases[0],expected="declarative")
        self.assertFalse(evaluate(cases)["passed"])

    def test_duplicate_id_rejected(self):
        with self.assertRaises(ValueError):
            evaluate([CASES[0]]*2)

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            evaluate([])

    def test_boolean_threshold_rejected(self):
        with self.assertRaises(ValueError):
            evaluate(min_cases_per_feature=True)

    def test_invalid_accuracy_rejected(self):
        with self.assertRaises(ValueError):
            evaluate(min_accuracy_per_feature=2)

    def test_invalid_feature_rejected(self):
        with self.assertRaises(ValueError):
            evaluate([SyntaxFeatureProbeV1("a","Hello.","other","x")])

    def test_invalid_sentence_rejected(self):
        with self.assertRaises(ValueError):
            evaluate([SyntaxFeatureProbeV1("a","","kind","question")])

    def test_no_release(self):
        self.assertFalse(evaluate()["release_authorized"])

    def test_not_blind_holdout(self):
        self.assertFalse(evaluate()["independent_holdout_proven"])

    def test_results_have_observed(self):
        self.assertIn("observed",evaluate()["results"][0])
