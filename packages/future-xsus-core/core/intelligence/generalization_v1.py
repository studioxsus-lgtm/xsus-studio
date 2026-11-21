"""Seeded held-out Horn-rule generalization evaluation.

Uses a separate fixed-point oracle and deterministic generated cases. This
measures in-domain symbolic rule handling, not open-world intelligence.
"""
from dataclasses import dataclass
import random
from .reasoning_v1 import ReasoningEngine, Rule, verify_proof


@dataclass(frozen=True, slots=True)
class GeneralizationScore:
    difficulty: str
    correct: int
    total: int


@dataclass(frozen=True, slots=True)
class GeneralizationReport:
    status: str
    seed: int
    scores: tuple[GeneralizationScore, ...]
    failures: tuple[str, ...]
    limitations: tuple[str, ...]


def _oracle(facts: tuple[str, ...], rules: tuple[Rule, ...], query: str) -> bool:
    """Independent set-closure implementation, without ReasoningEngine."""
    known = set(facts)
    for _ in range(128):
        expanded = known | {rule.conclusion for rule in rules
                            if set(rule.premises).issubset(known)}
        if expanded == known:
            return query in known
        known = expanded
    raise ValueError("oracle closure did not converge")


class GeneralizationEvaluator:
    def run(self, *, seed: int = 631, cases_per_level: int = 24) -> GeneralizationReport:
        if type(seed) is not int or not 0 <= seed <= 2**32 - 1:
            raise ValueError("seed out of range")
        if type(cases_per_level) is not int or not 1 <= cases_per_level <= 64:
            raise ValueError("cases_per_level must be 1 to 64")
        rng = random.Random(seed)
        scores = []
        failures = []
        for difficulty, depth in (("short", 2), ("medium", 5), ("long", 10)):
            correct = 0
            for index in range(cases_per_level):
                atoms = tuple("n%d" % j for j in range(depth + 2))
                # Randomly rename each node to prevent fixed example matching.
                labels = list(atoms)
                rng.shuffle(labels)
                rules = [Rule((labels[j],), labels[j + 1]) for j in range(depth)]
                # Distractor cycle cannot create support without a seed.
                rules.extend((Rule((labels[-1],), labels[-2]),
                              Rule((labels[-2],), labels[-1])))
                rng.shuffle(rules)
                supported = index % 2 == 0
                facts = (labels[0],) if supported else (labels[-1],)
                query = labels[depth]
                expected = _oracle(facts, tuple(rules), query)
                result = ReasoningEngine(facts, tuple(rules)).prove(query)
                proof_valid = (not result.entailed or
                               verify_proof(result, facts, tuple(rules)))
                valid = result.entailed == expected and proof_valid
                if valid:
                    correct += 1
                else:
                    failures.append("%s_%d" % (difficulty, index))
            scores.append(GeneralizationScore(difficulty, correct, cases_per_level))
        return GeneralizationReport(
            "pass" if not failures else "fail", seed, tuple(scores),
            tuple(failures),
            ("seeded_generated_horn_problems_only",
             "not_natural_language_or_open_world_generalization",
             "oracle_and_engine_share_horn_semantics"))
