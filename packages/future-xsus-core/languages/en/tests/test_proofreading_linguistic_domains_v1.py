import unittest
from languages.en.evaluation.proofreading_linguistic_domains_v1 import (
    LinguisticDomainAssignmentV1 as Assignment,
    LinguisticDomainThresholdV1 as Threshold,
    evaluate_proofreading_linguistic_domains_v1 as evaluate,
)


class LinguisticDomainV1Tests(unittest.TestCase):
    def setUp(self):
        self.report = {
            "contract": "future-xsus-core.proofreading-unified-quality.v1",
            "artifacts_authenticated_at_check": True,
            "category_manifest_authenticated_at_check": True,
            "passed": True,
            "categories": {
                "agreement": {"count": 2, "correct": 2, "regressions": 0, "passed": True},
                "word_forms": {"count": 2, "correct": 2, "regressions": 0, "passed": True},
                "word_order": {"count": 2, "correct": 2, "regressions": 0, "passed": True},
                "correct_text": {"count": 2, "correct": 2, "regressions": 0, "passed": True},
            },
        }
        self.assignments = [
            Assignment("agreement", "grammar"),
            Assignment("word_forms", "morphology"),
            Assignment("word_order", "syntax"),
            Assignment("correct_text", "preservation"),
        ]

    def run_gate(self, **kwargs):
        return evaluate(self.report, self.assignments, **kwargs)

    def test_pass(self):
        self.assertTrue(self.run_gate()["passed"])

    def test_four_domains(self):
        self.assertEqual(len(self.run_gate()["domains"]), 4)

    def test_all_covered(self):
        self.assertTrue(self.run_gate()["all_domains_covered"])

    def test_accuracy(self):
        self.assertEqual(self.run_gate()["domains"]["grammar"]["accuracy"], 1.0)

    def test_case_count(self):
        self.assertEqual(self.run_gate()["domains"]["syntax"]["count"], 2)

    def test_no_release(self):
        self.assertFalse(self.run_gate()["release_authorized"])

    def test_no_competence_claim(self):
        self.assertFalse(self.run_gate()["independent_language_competence_proven"])

    def test_assignments_not_authenticated(self):
        self.assertFalse(self.run_gate()["domain_assignments_authenticated"])

    def test_missing_category(self):
        with self.assertRaises(ValueError):
            evaluate(self.report, self.assignments[:-1])

    def test_duplicate_category(self):
        with self.assertRaises(ValueError):
            evaluate(self.report, self.assignments + [self.assignments[0]])

    def test_unknown_domain(self):
        with self.assertRaises(ValueError):
            evaluate(self.report, [Assignment("agreement", "other")] + self.assignments[1:])

    def test_unverified_report(self):
        self.report["artifacts_authenticated_at_check"] = False
        with self.assertRaises(ValueError):
            self.run_gate()

    def test_failed_category(self):
        self.report["categories"]["agreement"]["passed"] = False
        with self.assertRaises(ValueError):
            self.run_gate()

    def test_failed_overall(self):
        self.report["passed"] = False
        self.assertFalse(self.run_gate()["passed"])

    def test_min_cases(self):
        self.assertFalse(self.run_gate(default_threshold=Threshold(min_cases=3))["passed"])

    def test_min_accuracy(self):
        self.report["categories"]["agreement"]["correct"] = 1
        self.assertFalse(self.run_gate()["passed"])

    def test_regression(self):
        self.report["categories"]["agreement"]["regressions"] = 1
        self.assertFalse(self.run_gate()["passed"])

    def test_invalid_threshold(self):
        with self.assertRaises(ValueError):
            self.run_gate(default_threshold=Threshold(min_cases=True))

    def test_invalid_mapping(self):
        with self.assertRaises(ValueError):
            self.run_gate(thresholds={"unknown": Threshold()})

    def test_invalid_count(self):
        self.report["categories"]["agreement"]["count"] = -1
        with self.assertRaises(ValueError):
            self.run_gate()

    def test_empty_categories(self):
        self.report["categories"] = {}
        with self.assertRaises(ValueError):
            self.run_gate()
