"""Explicit grammatical agreement; missing evidence never implies agreement."""
from dataclasses import dataclass
from enum import Enum

class Agreement(str, Enum):
    MATCH = "match"
    MISMATCH = "mismatch"
    UNKNOWN = "unknown"

@dataclass(frozen=True)
class Features:
    gender: str | None = None
    number: str | None = None
    case: str | None = None
    person: int | None = None

    def __post_init__(self):
        for name, allowed in (
            ("gender", ("masculine", "feminine", "neuter")),
            ("number", ("singular", "plural")),
            ("case", ("nominative", "genitive", "dative", "accusative", "ablative")),
            ("person", (1, 2, 3)),
        ):
            value = getattr(self, name)
            if value is not None and (value not in allowed or isinstance(value, bool)):
                raise ValueError("Invalid grammatical feature: " + name)

def compare(left: Features, right: Features, dimensions: tuple[str, ...]) -> Agreement:
    if not dimensions or any(d not in ("gender", "number", "case", "person") for d in dimensions):
        raise ValueError("Invalid agreement dimensions")
    unknown = False
    for dimension in dimensions:
        a, b = getattr(left, dimension), getattr(right, dimension)
        if a is None or b is None:
            unknown = True
        elif a != b:
            return Agreement.MISMATCH
    return Agreement.UNKNOWN if unknown else Agreement.MATCH

def subject_verb(subject: Features, verb: Features) -> Agreement:
    return compare(subject, verb, ("person", "number"))

def noun_adjective(noun: Features, adjective: Features) -> Agreement:
    return compare(noun, adjective, ("gender", "number", "case"))
