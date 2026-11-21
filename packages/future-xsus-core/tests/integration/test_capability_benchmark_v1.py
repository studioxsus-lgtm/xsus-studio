"""Capability score reporting, abstention, and baseline regression."""
import unittest
from dataclasses import replace
from core.intelligence.capability_benchmark_v1 import (
    CapabilityBenchmark, CapabilityCase, CapabilityScore)
from core.intelligence.readiness_v1 import IntelligenceReadinessGate


class CapabilityBenchmarkTests(unittest.TestCase):
    def setUp(self):
        fixtures = IntelligenceReadinessGate.fixtures()
        categories = ("reasoning", "problem_solving", "planning", "decision",
                      "abstention")
        self.cases = tuple(CapabilityCase(category, case)
                           for category, case in zip(categories, fixtures))
        self.benchmark = CapabilityBenchmark()

    def test_authored_five_capabilities_pass(self):
        report = self.benchmark.evaluate(self.cases)
        self.assertEqual(report.status, "pass")
        self.assertEqual((report.passed, report.total), (5, 5))

    def test_scores_per_capability(self):
        report = self.benchmark.evaluate(self.cases)
        self.assertEqual(len(report.scores), 5)
        self.assertTrue(all((score.passed, score.total) == (1, 1)
                            for score in report.scores))

    def test_bad_expected_answer_detected(self):
        changed = replace(self.cases[0].case, expected_answer="incorrect")
        cases = (CapabilityCase("reasoning", changed),) + self.cases[1:]
        report = self.benchmark.evaluate(cases)
        self.assertEqual(report.status, "fail")
        self.assertEqual(report.failed_case_ids, (self.cases[0].case.case_id,))

    def test_capability_regression(self):
        baseline = self.benchmark.evaluate(self.cases)
        degraded = replace(baseline, scores=tuple(
            CapabilityScore(score.capability, 0, score.total)
            if score.capability == "reasoning" else score
            for score in baseline.scores))
        self.assertEqual(CapabilityBenchmark.compare(degraded, baseline),
                         ("reasoning",))

    def test_shape_changes_rejected(self):
        baseline = self.benchmark.evaluate(self.cases)
        changed = replace(baseline, total=baseline.total + 1)
        self.assertEqual(CapabilityBenchmark.compare(changed, baseline),
                         ("benchmark_shape_changed",))

    def test_duplicate_ids_rejected(self):
        with self.assertRaises(ValueError):
            self.benchmark.evaluate(self.cases + (self.cases[0],))

    def test_limitations_explicit(self):
        report = self.benchmark.evaluate(self.cases)
        self.assertIn("not_generalization_measurement", report.limitations)


if __name__ == "__main__":
    unittest.main()
