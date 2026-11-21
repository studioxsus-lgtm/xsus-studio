"""Deterministic metamorphic and adversarial checks for bounded Horn reasoning.

A metamorphic check tests invariants under controlled transformations;
it does not establish open-world generalization.
"""
from dataclasses import dataclass
from .reasoning_v1 import ReasoningEngine, Rule, verify_proof


@dataclass(frozen=True, slots=True)
class AdversarialCase:
    case_id: str
    facts: tuple[str, ...]
    rules: tuple[Rule, ...]
    query: str
    expected_entailed: bool

    def __post_init__(self):
        if not isinstance(self.case_id, str) or not self.case_id:
            raise ValueError("invalid case ID")
        if type(self.expected_entailed) is not bool:
            raise ValueError("invalid expected entailment")


@dataclass(frozen=True, slots=True)
class AdversarialOutcome:
    case_id: str
    passed: bool
    observed_entailed: bool
    checks: tuple[tuple[str, bool], ...]


@dataclass(frozen=True, slots=True)
class AdversarialReport:
    status: str
    outcomes: tuple[AdversarialOutcome, ...]
    passed: int
    total: int
    limitations: tuple[str, ...]


class AdversarialReasoningHarness:
    def evaluate(self, cases: tuple[AdversarialCase, ...]) -> AdversarialReport:
        if not isinstance(cases, tuple) or not 1 <= len(cases) <= 128:
            raise ValueError("requires 1 to 128 adversarial cases")
        if any(not isinstance(case, AdversarialCase) for case in cases):
            raise ValueError("invalid adversarial case")
        if len({case.case_id for case in cases}) != len(cases):
            raise ValueError("duplicate adversarial IDs")
        outcomes = []
        for case in cases:
            base = ReasoningEngine(case.facts, case.rules).prove(case.query)
            reversed_facts = ReasoningEngine(tuple(reversed(case.facts)),
                                             case.rules).prove(case.query)
            reversed_rules = ReasoningEngine(case.facts,
                                             tuple(reversed(case.rules))).prove(case.query)
            checks = (
                ("expected_entailment", base.entailed == case.expected_entailed),
                ("proof_replays", not base.entailed or
                 verify_proof(base, case.facts, case.rules)),
                ("fact_permutation_invariant", base.entailed == reversed_facts.entailed),
                ("rule_permutation_invariant", base.entailed == reversed_rules.entailed),
                ("unknown_never_verified", base.entailed or
                 (not verify_proof(base, case.facts, case.rules))),
            )
            outcomes.append(AdversarialOutcome(
                case.case_id, all(passed for _, passed in checks), base.entailed, checks))
        passed = sum(outcome.passed for outcome in outcomes)
        return AdversarialReport(
            "pass" if passed == len(cases) else "fail",
            tuple(outcomes), passed, len(cases),
            ("authored_cases_and_metamorphic_transforms_only",
             "no_negation_or_conflict_resolution",
             "not_open_world_generalization"))
