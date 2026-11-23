"""Restricted Albanian clause extensions: negation, questions and coordination.

Only explicitly recognized constructions are returned. No free-form parsing claims.
"""
from dataclasses import dataclass
from .text import normalize, tokenize
from .syntax import Clause, parse_clause

@dataclass(frozen=True, slots=True)
class ExtendedClause:
    clauses: tuple[Clause, ...]
    negated: tuple[bool, ...]
    interrogative: bool
    connector: str | None

_CONNECTORS = frozenset({"dhe", "por", "ose"})

def _parse_unit(tokens: list[str]) -> tuple[Clause, bool] | None:
    if not tokens:
        return None
    negated = False
    # Negative marker must precede the finite verb after an overt subject.
    if len(tokens) >= 3 and tokens[1] == "nuk":
        negated = True
        tokens = [tokens[0], *tokens[2:]]
    result = parse_clause(" ".join(tokens))
    if result is None:
        return None
    return result, negated

def parse_extended_clause(text: str) -> ExtendedClause | None:
    """Parse up to two supported clauses joined by dhe/por/ose."""
    if not isinstance(text, str):
        raise TypeError("text must be a string")
    tokens = [normalize(token) for token in tokenize(text)]
    if not tokens:
        return None
    interrogative = tokens[-1] == "?"
    if tokens[-1] in {".", "!", "?"}:
        tokens.pop()
    if not tokens or any(t in {".", "!", "?"} for t in tokens):
        return None
    connectors = [(i, token) for i, token in enumerate(tokens) if token in _CONNECTORS]
    if len(connectors) > 1:
        return None
    if connectors:
        idx, connector = connectors[0]
        segments = [tokens[:idx], tokens[idx + 1:]]
    else:
        connector = None
        segments = [tokens]
    parsed = [_parse_unit(segment) for segment in segments]
    if any(item is None for item in parsed):
        return None
    return ExtendedClause(tuple(item[0] for item in parsed),
                          tuple(item[1] for item in parsed),
                          interrogative, connector)
