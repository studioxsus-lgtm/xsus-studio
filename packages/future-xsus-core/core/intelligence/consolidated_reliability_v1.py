"""Cross-engine reliability gate combining authored intelligence and recovery checks.

Reports deterministic evidence only; never asserts general intelligence or
production readiness.
"""
from dataclasses import dataclass
from .readiness_v1 import IntelligenceReadinessGate
from .recovery_stress_v1 import RecoveryStressHarness


@dataclass(frozen=True, slots=True)
class ConsolidatedReliabilityReport:
    status: str
    checks: tuple[tuple[str, bool], ...]
    failures: tuple[str, ...]
    limitations: tuple[str, ...]


class ConsolidatedReliabilityGate:
    def __init__(self, readiness=None, recovery=None):
        self.readiness = readiness if readiness is not None else IntelligenceReadinessGate()
        self.recovery = recovery if recovery is not None else RecoveryStressHarness()

    def check(self) -> ConsolidatedReliabilityReport:
        readiness = self.readiness.check()
        recovery = self.recovery.run()
        checks = tuple(("intelligence_" + name, passed)
                       for name, passed in readiness.checks) + (
            ("recovery_scenarios_pass", recovery.status == "pass"),
            ("recovery_four_boundaries", len(recovery.scenarios) == 4),
            ("recovery_no_failed_scenarios",
             all(s.outcome == "pass" for s in recovery.scenarios)),
        )
        failures = tuple(name for name, passed in checks if not passed)
        return ConsolidatedReliabilityReport(
            "pass" if not failures else "fail", checks, failures,
            tuple(dict.fromkeys(readiness.limitations + recovery.limitations + (
                "real_crash_tests_run_separately_in_ci",
                "no_production_or_general_intelligence_claim",
            ))))
