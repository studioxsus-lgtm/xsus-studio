"""Multi-goal formal problem solving; no external execution."""
from dataclasses import dataclass
from .reasoning_v1 import ProofStep, ReasoningResult, verify_proof, _atom
from .reasoning_v2 import MultiStepReasoner

@dataclass(frozen=True, slots=True)
class MultiGoalSolution:
    status: str
    goals: tuple[str, ...]
    resolved: tuple[str, ...]
    unresolved: tuple[str, ...]
    steps: tuple[ProofStep, ...]
    executable: bool = False

class ComplexProblemSolver:
    def __init__(self, *, max_steps=512):
        if type(max_steps) is not int or not 1 <= max_steps <= 512:
            raise ValueError("Invalid proof budget")
        self.max_steps = max_steps

    def solve(self, goals, facts, rules):
        if type(goals) is not tuple or not 1 <= len(goals) <= 32:
            raise ValueError("Expected 1 to 32 goals")
        for goal in goals:
            _atom(goal)
        if len(set(goals)) != len(goals):
            raise ValueError("Duplicate goals")
        engine = MultiStepReasoner(facts, rules)
        steps = {}
        resolved, unresolved = [], []
        for goal, result in zip(goals, engine.prove_many(goals)):
            if not result.entailed:
                unresolved.append(goal)
                continue
            if not verify_proof(result, facts, rules):
                raise RuntimeError("Proof verification failed")
            resolved.append(goal)
            for step in result.proof:
                steps.setdefault(step.conclusion, step)
        if len(steps) > self.max_steps:
            return MultiGoalSolution("resource_limit", goals, (), goals, ())
        status = "solved" if not unresolved else "partial" if resolved else "unknown"
        return MultiGoalSolution(status, goals, tuple(resolved), tuple(unresolved), tuple(steps.values()))

    def evaluate(self, solution, facts, rules):
        if not isinstance(solution, MultiGoalSolution) or solution.executable:
            return False
        try:
            return solution == self.solve(solution.goals, facts, rules)
        except (ValueError, TypeError, RuntimeError):
            return False
