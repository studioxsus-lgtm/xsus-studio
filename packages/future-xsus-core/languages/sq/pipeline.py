"""Stage 11: isolated Albanian written-text analysis pipeline.

Results are deterministic and expose uncertainty rather than inventing parses.
"""
from dataclasses import dataclass
from .text import detect_language, lookup, normalize, tokenize
from .verbs import VerbForm, analyze_verb
from .nominals import NominalAnalysis, analyze_nominal
from .advanced_syntax import ExtendedClause, parse_extended_clause

@dataclass(frozen=True, slots=True)
class TokenAnalysis:
    token: str
    normalized: str
    lexical_pos: str | None
    verbs: tuple[VerbForm, ...]
    nominals: tuple[NominalAnalysis, ...]

@dataclass(frozen=True, slots=True)
class TextAnalysis:
    language: str | None
    tokens: tuple[TokenAnalysis, ...]
    clause: ExtendedClause | None

def analyze_text(text: str) -> TextAnalysis:
    """Analyze one written text; clause is None if its syntax is unsupported."""
    if not isinstance(text, str):
        raise TypeError("text must be a string")
    tokens = tuple(
        TokenAnalysis(
            token=token,
            normalized=normalize(token),
            lexical_pos=lookup(token),
            verbs=analyze_verb(token),
            nominals=analyze_nominal(token),
        )
        for token in tokenize(text)
    )
    return TextAnalysis(
        language=detect_language(text),
        tokens=tokens,
        clause=parse_extended_clause(text),
    )
