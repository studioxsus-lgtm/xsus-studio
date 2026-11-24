"""Conservative marked yes/no questions with explicit subjects."""
from .text import normalize, tokenize
from .advanced_syntax import ExtendedClause, parse_extended_clause

def parse_marked_question(text: str) -> ExtendedClause | None:
    tokens = [normalize(t) for t in tokenize(text)]
    if len(tokens) < 4 or tokens[0] != "a" or tokens[-1] != "?":
        return None
    result = parse_extended_clause(" ".join(tokens[1:]))
    if result is None or len(result.clauses) != 1:
        return None
    return result
