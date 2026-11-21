"""Evidence-based, fail-closed readiness gate for the bounded intelligence stack.

Readiness here means authored integration checks pass; not production or AGI.
"""
from dataclasses import dataclass
from .evaluation_v1 import EvaluationCase, IntelligenceEvaluator
from .resilience_v1 import ResilienceHarness
from .unified_pipeline_v1 import PipelineRequest
from .reasoning_v1 import Rule
from .task_planner_v1 import Task
from .decision_v1 import Criterion, Option


@dataclass(frozen=True, slots=True)
class ReadinessResult:
    status: str
    checks: tuple[tuple[str, bool], ...]
    failures: tuple[str, ...]
    limitations: tuple[str, ...]


class IntelligenceReadinessGate:
    def __init__(self, evaluator=None, resilience=None):
        self.evaluator = evaluator if evaluator is not None else IntelligenceEvaluator()
        self.resilience = resilience if resilience is not None else ResilienceHarness()

    @staticmethod
    def fixtures():
        return (
            EvaluationCase("reason", PipelineRequest(
                "readiness_reason", "reason",
                {"query": "ready", "facts": ("tested",),
                 "rules": (Rule(("tested",), "ready"),)}),
                "resolved", "ready", True),
            EvaluationCase("solve", PipelineRequest(
                "readiness_solve", "solve_problem",
                {"goal": "ready", "facts": ("tested",),
                 "rules": (Rule(("tested",), "ready"),)}),
                "resolved", "ready", True),
            EvaluationCase("plan", PipelineRequest(
                "readiness_plan", "plan_tasks",
                {"tasks": (Task("build", "Build"), Task("test", "Test", ("build",)))}),
                "proposed", None, True),
            EvaluationCase("decide", PipelineRequest(
                "readiness_decide", "decide",
                {"criteria": (Criterion("quality", 1),),
                 "options": (Option("a", "A", (("quality", 90),)),)}),
                "proposed", "a", True),
            EvaluationCase("abstain", PipelineRequest(
                "readiness_abstain", "reason",
                {"query": "ready", "facts": (),
                 "rules": (Rule(("tested",), "ready"),)}),
                "abstained", None, False),
        )

    def check(self) -> ReadinessResult:
        cases = self.fixtures()
        report = self.evaluator.evaluate(cases)
        stress = self.resilience.run(tuple(c.request for c in cases), rounds=10)
        checks = (
            ("all_authored_cases_pass", report.status == "pass" and report.passed == len(cases)),
            ("all_repeated_requests_stable", stress.status == "pass"),
            ("expected_execution_count", stress.executions == 10 * len(cases)),
            ("no_stress_failures", stress.failures == 0),
            ("no_nondeterminism", not stress.nondeterministic_ids),
        )
        failures = tuple(name for name, passed in checks if not passed)
        return ReadinessResult("pass" if not failures else "fail", checks, failures,
                               ("bounded_authored_fixtures_only",
                                "not_production_readiness",
                                "no_external_truth_or_autonomy_claim"))
