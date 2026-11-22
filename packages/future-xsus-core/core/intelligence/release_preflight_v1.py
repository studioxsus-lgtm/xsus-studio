"""Local release preflight. Passing local checks never certifies production."""
from dataclasses import dataclass
from .consolidated_reliability_v1 import ConsolidatedReliabilityGate
from .authorized_gateway_v1 import IntelligencePrincipal
from .xsus_app_adapter_v1 import XSUSAppIntelligenceAdapter
from .multi_engine_v1 import MultiEngineCoordinator
from .reasoning_v1 import Rule
from .task_planner_v1 import Task

EXTERNAL_GATES = ("authenticated_http_integration", "browser_end_to_end",
                  "production_load_measurement", "deployment_recovery",
                  "security_review", "operational_monitoring")


@dataclass(frozen=True, slots=True)
class ReleasePreflightReport:
    status: str
    checks: tuple[tuple[str, bool], ...]
    pending_external_gates: tuple[str, ...]
    production_ready: bool


class ReleasePreflight:
    def check(self):
        checks = []

        def attempt(name, fn):
            try:
                passed = fn() is True
            except Exception:
                passed = False
            checks.append((name, passed))

        attempt("consolidated_reliability",
                lambda: ConsolidatedReliabilityGate().check().status == "pass")
        adapter = XSUSAppIntelligenceAdapter()
        envelope = {"contractVersion": "1.0.0", "requestId": "preflight",
                    "query": "done", "facts": ["start"],
                    "rules": [{"premises": ["start"], "conclusion": "done"}]}
        principal = IntelligencePrincipal("preflight", frozenset(("reason",)))

        def contract():
            result = adapter.reason(principal, envelope)
            return (result["status"] == "resolved" and result["answer"] == "done"
                    and result["verifiedDerivation"] is True
                    and result["executionAuthorized"] is False)

        def denial():
            try:
                adapter.reason(IntelligencePrincipal("preflight", frozenset()), envelope)
            except PermissionError:
                return True
            return False

        def coordination():
            result = MultiEngineCoordinator().propose(
                "done", ("start",), (Rule(("start",), "done"),),
                (Task("build", "Build"), Task("test", "Test", ("build",))))
            return (result.status == "proposed" and result.verified
                    and result.ordered_tasks == ("build", "test")
                    and "no_execution" in result.limitations)

        attempt("app_adapter_contract", contract)
        attempt("unauthorized_request_denied", denial)
        attempt("multi_engine_coordination", coordination)
        return ReleasePreflightReport(
            "local_pass" if all(passed for _, passed in checks) else "blocked",
            tuple(checks), EXTERNAL_GATES, False)
