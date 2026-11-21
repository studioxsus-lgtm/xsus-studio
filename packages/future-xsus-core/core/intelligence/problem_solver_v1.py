"""Bounded multi-step formal problem solver with replay-verified plans.

Plans are proof steps, not executable tools. Only propositional Horn rules are
supported; supplied facts are not independently established as true.
"""
from dataclasses import dataclass
from .reasoning_v1 import ReasoningEngine, Rule, ProofStep, verify_proof


@dataclass(frozen=True, slots=True)
class Solution:
    status: str
    goal: str
    steps: tuple[ProofStep, ...]
    source_facts: tuple[str, ...]
    verified_derivation: bool
    executable: bool
    limitations: tuple[str, ...]


class ProblemSolver:
    def __init__(self, *, max_steps: int = 128):
        if type(max_steps) is not int or not 1 <= max_steps <= 128:
            raise ValueError("max_steps must be between 1 and 128")
        self.max_steps = max_steps

    def solve(self, goal: str, facts: tuple[str, ...], rules: tuple[Rule, ...]) -> Solution:
        engine = ReasoningEngine(facts, rules)
        result = engine.prove(goal)
        if not result.entailed:
            return Solution(result.status, goal, (), engine.facts, False, False,
                            result.limitations)
        if len(result.proof) > self.max_steps:
            return Solution("resource_limit", goal, (), engine.facts, False, False,
                            ("proof_exceeds_plan_budget",))
        verified = verify_proof(result, engine.facts, rules)
        if not verified:
            return Solution("verification_failed", goal, (), engine.facts, False,
                            False, ("proof_replay_failed",))
        return Solution("solved", goal, result.proof, engine.facts, True, False,
                        ("formal_problem_only", "no_tool_execution",
                         "source_facts_not_externally_verified"))

    def evaluate(self, solution: Solution, facts: tuple[str, ...],
                 rules: tuple[Rule, ...]) -> bool:
        if not isinstance(solution, Solution) or solution.status != "solved":
            return False
        from .reasoning_v1 import ReasoningResult
        replay = ReasoningResult("entailed", solution.goal, True,
                                 solution.steps, 0, 0, ())
        return (solution.verified_derivation
                and not solution.executable
                and solution.source_facts == tuple(dict.fromkeys(facts))
                and len(solution.steps) <= self.max_steps
                and verify_proof(replay, facts, rules))
