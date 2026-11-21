"""Bounded, deterministic propositional reasoning with auditable proofs.

Only explicit ground facts and Horn implications are supported. No negation,
quantifiers, real-world truth inference, or arbitrary Python execution.
"""
from dataclasses import dataclass
import re

_ATOM = re.compile(r"^[a-z][a-z0-9_]{0,63}$")
MAX_FACTS = 256
MAX_RULES = 256
MAX_PREMISES = 8
MAX_ROUNDS = 64


def _atom(value: str) -> str:
    if not isinstance(value, str) or not _ATOM.fullmatch(value):
        raise ValueError("atoms must be lowercase identifiers of at most 64 characters")
    return value


@dataclass(frozen=True, slots=True)
class Rule:
    premises: tuple[str, ...]
    conclusion: str

    def __post_init__(self):
        if not isinstance(self.premises, tuple) or not 1 <= len(self.premises) <= MAX_PREMISES:
            raise ValueError("rule requires 1 to 8 premises")
        for atom in self.premises:
            _atom(atom)
        if len(set(self.premises)) != len(self.premises):
            raise ValueError("duplicate premises")
        _atom(self.conclusion)


@dataclass(frozen=True, slots=True)
class ProofStep:
    conclusion: str
    premises: tuple[str, ...]
    rule_index: int | None


@dataclass(frozen=True, slots=True)
class ReasoningResult:
    status: str
    query: str
    entailed: bool
    proof: tuple[ProofStep, ...]
    derived_count: int
    rounds: int
    limitations: tuple[str, ...]


class ReasoningEngine:
    def __init__(self, facts: tuple[str, ...], rules: tuple[Rule, ...]):
        if not isinstance(facts, tuple) or len(facts) > MAX_FACTS:
            raise ValueError("facts must be a bounded tuple")
        if not isinstance(rules, tuple) or len(rules) > MAX_RULES:
            raise ValueError("rules must be a bounded tuple")
        for fact in facts:
            _atom(fact)
        if any(not isinstance(rule, Rule) for rule in rules):
            raise ValueError("invalid rule")
        self.facts = tuple(dict.fromkeys(facts))
        self.rules = rules

    def prove(self, query: str) -> ReasoningResult:
        query = _atom(query)
        known = set(self.facts)
        provenance = {fact: ProofStep(fact, (), None) for fact in self.facts}
        rounds = 0
        for _ in range(MAX_ROUNDS):
            additions = []
            for index, rule in enumerate(self.rules):
                if rule.conclusion not in known and all(p in known for p in rule.premises):
                    additions.append((rule.conclusion, rule.premises, index))
            if not additions:
                break
            for conclusion, premises, index in additions:
                if conclusion not in known:
                    known.add(conclusion)
                    provenance[conclusion] = ProofStep(conclusion, premises, index)
            rounds += 1
        else:
            return ReasoningResult("resource_limit", query, False, (), len(known),
                                   rounds, ("reasoning_limit_reached",))
        if query not in known:
            return ReasoningResult("unknown", query, False, (), len(known), rounds,
                                   ("absence_of_proof_is_not_disproof",))
        ordered = []
        visited = set()

        def visit(atom):
            if atom in visited:
                return
            visited.add(atom)
            step = provenance[atom]
            for premise in step.premises:
                visit(premise)
            ordered.append(step)

        visit(query)
        return ReasoningResult("entailed", query, True, tuple(ordered),
                               len(known), rounds,
                               ("valid_only_for_supplied_facts_and_rules",))


def verify_proof(result: ReasoningResult, facts: tuple[str, ...],
                 rules: tuple[Rule, ...]) -> bool:
    """Independently replay the proof steps against the original premises."""
    if not isinstance(result, ReasoningResult) or not result.entailed:
        return False
    try:
        trusted = {_atom(fact) for fact in facts}
        if len(result.proof) == 0:
            return False
        for step in result.proof:
            if step.rule_index is None:
                if step.conclusion not in trusted or step.premises:
                    return False
            else:
                if not 0 <= step.rule_index < len(rules):
                    return False
                rule = rules[step.rule_index]
                if rule.conclusion != step.conclusion or rule.premises != step.premises:
                    return False
                if not all(p in trusted for p in step.premises):
                    return False
                trusted.add(step.conclusion)
        return result.proof[-1].conclusion == result.query and result.query in trusted
    except (TypeError, ValueError, AttributeError):
        return False
