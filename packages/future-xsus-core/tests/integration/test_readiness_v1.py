"""Cross-engine readiness gate and failure-mode regression tests."""
import unittest
from dataclasses import replace
from core.intelligence.readiness_v1 import IntelligenceReadinessGate
from core.intelligence.evaluation_v1 import IntelligenceEvaluator
from core.intelligence.resilience_v1 import ResilienceHarness


class ReadinessTests(unittest.TestCase):
    def test_default_gate(self):
        report = IntelligenceReadinessGate().check()
        self.assertEqual(report.status, "pass")
        self.assertEqual(report.failures, ())
        self.assertEqual(len(report.checks), 5)

    def test_failing_evaluator_blocks_readiness(self):
        class BrokenEvaluator:
            def evaluate(self, cases):
                result = IntelligenceEvaluator().evaluate(cases)
                return replace(result, status="fail", passed=0)
        report = IntelligenceReadinessGate(evaluator=BrokenEvaluator()).check()
        self.assertEqual(report.status, "fail")
        self.assertIn("all_authored_cases_pass", report.failures)

    def test_failing_stress_blocks_readiness(self):
        class BrokenStress:
            def run(self, requests, *, rounds):
                result = ResilienceHarness().run(requests, rounds=rounds)
                return replace(result, failures=1, status="fail")
        report = IntelligenceReadinessGate(resilience=BrokenStress()).check()
        self.assertEqual(report.status, "fail")
        self.assertIn("no_stress_failures", report.failures)

    def test_nondeterminism_blocks_readiness(self):
        class BrokenStress:
            def run(self, requests, *, rounds):
                result = ResilienceHarness().run(requests, rounds=rounds)
                return replace(result, nondeterministic_ids=("reason",), status="fail")
        report = IntelligenceReadinessGate(resilience=BrokenStress()).check()
        self.assertIn("no_nondeterminism", report.failures)

    def test_no_production_claim(self):
        report = IntelligenceReadinessGate().check()
        self.assertIn("not_production_readiness", report.limitations)


if __name__ == "__main__":
    unittest.main()
