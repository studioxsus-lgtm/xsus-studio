"""Auditable bounded multi-criteria decision support.

Scores are user-provided assumptions, not verified observations. Hard
constraints are evaluated before ranking. No actions are executed.
"""
from dataclasses import dataclass
from .knowledge_v1 import _id, _text

MAX_OPTIONS = 64
MAX_CRITERIA = 16


@dataclass(frozen=True, slots=True)
class Criterion:
    name: str
    weight: int
    minimum: int | None = None

    def __post_init__(self):
        _id(self.name)
        if type(self.weight) is not int or not 1 <= self.weight <= 100:
            raise ValueError("criterion weight must be 1 to 100")
        if self.minimum is not None and (type(self.minimum) is not int or not 0 <= self.minimum <= 100):
            raise ValueError("minimum must be 0 to 100")


@dataclass(frozen=True, slots=True)
class Option:
    option_id: str
    description: str
    scores: tuple[tuple[str, int], ...]

    def __post_init__(self):
        _id(self.option_id)
        _text(self.description)
        if not isinstance(self.scores, tuple):
            raise ValueError("scores must be a tuple")
        names = []
        for item in self.scores:
            if not isinstance(item, tuple) or len(item) != 2:
                raise ValueError("invalid score entry")
            name, value = item
            _id(name)
            if type(value) is not int or not 0 <= value <= 100:
                raise ValueError("score must be 0 to 100")
            names.append(name)
        if len(set(names)) != len(names):
            raise ValueError("duplicate criterion score")


@dataclass(frozen=True, slots=True)
class DecisionRow:
    option_id: str
    eligible: bool
    weighted_score: int | None
    rejected_by: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class Decision:
    status: str
    winner_id: str | None
    ranking: tuple[DecisionRow, ...]
    limitations: tuple[str, ...]


class DecisionEngine:
    def decide(self, criteria: tuple[Criterion, ...], options: tuple[Option, ...]) -> Decision:
        if not isinstance(criteria, tuple) or not 1 <= len(criteria) <= MAX_CRITERIA:
            raise ValueError("requires 1 to 16 criteria")
        if not isinstance(options, tuple) or not 1 <= len(options) <= MAX_OPTIONS:
            raise ValueError("requires 1 to 64 options")
        if any(not isinstance(c, Criterion) for c in criteria) or any(not isinstance(o, Option) for o in options):
            raise ValueError("invalid criteria or options")
        names = tuple(c.name for c in criteria)
        if len(set(names)) != len(names):
            raise ValueError("duplicate criteria")
        if len({o.option_id for o in options}) != len(options):
            raise ValueError("duplicate options")
        rows = []
        for option in options:
            scores = dict(option.scores)
            if set(scores) != set(names):
                raise ValueError("each option must score every criterion exactly once")
            rejected = tuple(c.name for c in criteria
                             if c.minimum is not None and scores[c.name] < c.minimum)
            weighted = sum(c.weight * scores[c.name] for c in criteria)
            rows.append(DecisionRow(option.option_id, not rejected,
                                    weighted if not rejected else None, rejected))
        rows.sort(key=lambda r: (not r.eligible,
                                 -(r.weighted_score if r.weighted_score is not None else -1),
                                 r.option_id))
        winner = rows[0].option_id if rows[0].eligible else None
        return Decision("selected" if winner else "no_eligible_option", winner,
                        tuple(rows), ("scores_are_supplied_not_verified",
                                      "decision_support_only", "no_execution"))

    def verify(self, decision: Decision, criteria: tuple[Criterion, ...],
               options: tuple[Option, ...]) -> bool:
        if not isinstance(decision, Decision):
            return False
        try:
            return self.decide(criteria, options) == decision
        except ValueError:
            return False
