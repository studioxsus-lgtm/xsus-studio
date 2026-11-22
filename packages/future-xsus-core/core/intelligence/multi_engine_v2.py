"""Coordinate formal evidence and plans without authorizing execution."""
from dataclasses import dataclass
from .knowledge_v2 import EvidenceReasoner, EvidenceDerivation
from .task_planner_v1 import TaskPlanner

@dataclass(frozen=True, slots=True)
class CoordinationResult:
    status: str
    goals: tuple
    evidence: tuple[EvidenceDerivation, ...]
    ordered_tasks: tuple
    execution_authorized: bool = False
    limitations: tuple = ("formal_goals_only","caller_supplied_tasks",
                         "plan_goal_relationship_not_verified","no_external_truth_verification")

class AdvancedCoordinator:
    def __init__(self, store):
        self.reasoner = EvidenceReasoner(store)
        self.planner = TaskPlanner()

    def propose(self, owner_id, goals, rules, tasks):
        from .reasoning_v1 import _atom
        if type(goals) is not tuple or not 1 <= len(goals) <= 32:
            raise ValueError("Invalid goals")
        for goal in goals:
            _atom(goal)
        if len(set(goals)) != len(goals):
            raise ValueError("Duplicate goals")
        plan = self.planner.build(tasks)
        evidence = tuple(self.reasoner.infer(owner_id,g,rules) for g in goals)
        if not all(e.status == "supported" and e.verified_derivation for e in evidence):
            return CoordinationResult("abstained",goals,evidence,())
        if not self.planner.verify(plan):
            return CoordinationResult("plan_blocked",goals,evidence,())
        return CoordinationResult("proposed",goals,evidence,plan.ordered_ids)

    def evaluate(self, result, owner_id, rules, tasks):
        if not isinstance(result,CoordinationResult) or result.execution_authorized:
            return False
        try:
            return result == self.propose(owner_id,result.goals,rules,tasks)
        except (ValueError,TypeError,RuntimeError):
            return False
