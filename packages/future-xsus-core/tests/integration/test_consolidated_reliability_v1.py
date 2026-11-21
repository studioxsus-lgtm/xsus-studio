"""Consolidated reliability gate coverage and failure injection."""
import unittest
from dataclasses import replace
from core.intelligence.consolidated_reliability_v1 import ConsolidatedReliabilityGate
from core.intelligence.readiness_v1 import IntelligenceReadinessGate
from core.intelligence.recovery_stress_v1 import RecoveryStressHarness


class BrokenReadiness:
    def check(self):
        return replace(IntelligenceReadinessGate().check(), status="fail",
                       checks=(("all_authored_cases_pass", False),))


class BrokenRecovery:
    def run(self):
        return replace(RecoveryStressHarness().run(), status="fail",
                       scenarios=())


class ConsolidatedReliabilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.result = ConsolidatedReliabilityGate().check()

    def test_all_checks_pass(self):
        self.assertEqual(self.result.status, "pass")
        self.assertEqual(self.result.failures, ())

    def test_intelligence_checks_included(self):
        self.assertIn(("intelligence_all_authored_cases_pass", True),
                      self.result.checks)

    def test_recovery_checks_included(self):
        self.assertIn(("recovery_four_boundaries", True), self.result.checks)

    def test_fail_closed_on_intelligence_failure(self):
        result = ConsolidatedReliabilityGate(readiness=BrokenReadiness()).check()
        self.assertEqual(result.status, "fail")
        self.assertIn("intelligence_all_authored_cases_pass", result.failures)

    def test_fail_closed_on_recovery_failure(self):
        result = ConsolidatedReliabilityGate(recovery=BrokenRecovery()).check()
        self.assertEqual(result.status, "fail")
        self.assertIn("recovery_four_boundaries", result.failures)

    def test_limitations_are_explicit(self):
        self.assertIn("no_production_or_general_intelligence_claim",
                      self.result.limitations)


if __name__ == "__main__":
    unittest.main()
