"""Cross-engine coordination for explicit formal goals and proposed plans."""
from dataclasses import dataclass
from .kernel_v1 import IntelligenceKernel
from .reasoning_v1 import Rule
from .task_planner_v1 import Task


@dataclass(frozen=True, slots=True)
class CoordinatedResult:
    status: str
    goal: str
    ordered_tasks: tuple[str, ...]
    verified: bool
    limitations: tuple[str, ...]


class MultiEngineCoordinator:
    def __init__(self, kernel=None):
        self.kernel = kernel if kernel is not None else IntelligenceKernel()

    def propose(self, goal: str, facts: tuple[str, ...],
                rules: tuple[Rule, ...], tasks: tuple[Task, ...],
                *, max_steps: int = 128) -> CoordinatedResult:
        limits = ("formal_goal_only", "tasks_supplied_by_caller",
                  "plan_goal_relationship_not_verified", "no_execution",
                  "source_facts_not_externally_verified")
        reason = self.kernel.reason(goal, facts, rules)
        solution = self.kernel.solve_problem(goal, facts, rules, max_steps=max_steps)
        if reason.status != "resolved" or solution.status != "resolved":
            return CoordinatedResult("abstained", goal, (), False, limits)
        if (not reason.verified or not solution.verified
                or reason.answer != goal or solution.answer != goal
                or reason.evidence != solution.evidence):
            return CoordinatedResult("verification_failed", goal, (), False, limits)
        plan = self.kernel.plan_tasks(tasks)
        if plan.status != "proposed" or not plan.verified:
            return CoordinatedResult("abstained", goal, (), False, limits)
        return CoordinatedResult("proposed", goal, plan.steps, True, limits)
