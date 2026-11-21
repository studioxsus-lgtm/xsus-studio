"""Offline evaluation of bounded formal solving and task planning.

No autonomous actions are performed or authorized.
"""
from dataclasses import dataclass
from .problem_solver_v1 import ProblemSolver
from .task_planner_v1 import TaskPlanner, Task
from .reasoning_v1 import Rule


@dataclass(frozen=True, slots=True)
class ProblemEvaluationCase:
    case_id: str
    goal: str
    facts: tuple[str, ...]
    rules: tuple[Rule, ...]
    expected_solved: bool
    max_steps: int = 128


@dataclass(frozen=True, slots=True)
class PlanningEvaluationCase:
    case_id: str
    tasks: tuple[Task, ...]
    expected_planned: bool


@dataclass(frozen=True, slots=True)
class ProblemEvaluationOutcome:
    case_id: str
    passed: bool
    observed_status: str
    verified: bool


@dataclass(frozen=True, slots=True)
class ProblemEvaluationReport:
    status: str
    outcomes: tuple[ProblemEvaluationOutcome, ...]
    passed: int
    total: int
    limitations: tuple[str, ...]


class AutonomousProblemEvaluation:
    """'Autonomous' denotes unattended *evaluation*, never autonomous execution."""

    def evaluate(self, cases: tuple[ProblemEvaluationCase | PlanningEvaluationCase, ...]):
        if not isinstance(cases, tuple) or not 1 <= len(cases) <= 128:
            raise ValueError("requires 1 to 128 evaluation cases")
        if any(not isinstance(c, (ProblemEvaluationCase, PlanningEvaluationCase))
               for c in cases):
            raise ValueError("invalid case type")
        if any(not isinstance(c.case_id, str) or not c.case_id for c in cases):
            raise ValueError("invalid case identifier")
        if len({c.case_id for c in cases}) != len(cases):
            raise ValueError("duplicate case IDs")
        outcomes = []
        for case in cases:
            if isinstance(case, ProblemEvaluationCase):
                if type(case.expected_solved) is not bool:
                    raise ValueError("invalid expected outcome")
                solver = ProblemSolver(max_steps=case.max_steps)
                result = solver.solve(case.goal, case.facts, case.rules)
                verified = (solver.evaluate(result, case.facts, case.rules)
                            if result.status == "solved" else False)
                observed = result.status
                passed_case = ((result.status == "solved") == case.expected_solved
                               and (not case.expected_solved or verified)
                               and not result.executable)
            else:
                if type(case.expected_planned) is not bool:
                    raise ValueError("invalid expected outcome")
                planner = TaskPlanner()
                result = planner.build(case.tasks)
                verified = planner.verify(result) if result.status == "planned" else False
                observed = result.status
                passed_case = ((result.status == "planned") == case.expected_planned
                               and (not case.expected_planned or verified))
            outcomes.append(ProblemEvaluationOutcome(
                case.case_id, passed_case, observed, verified))
        passed = sum(o.passed for o in outcomes)
        return ProblemEvaluationReport(
            "pass" if passed == len(cases) else "fail",
            tuple(outcomes), passed, len(cases),
            ("authored_formal_problems_only", "no_autonomous_tool_execution",
             "no_real_world_goal_completion", "no_external_truth_verification"))
