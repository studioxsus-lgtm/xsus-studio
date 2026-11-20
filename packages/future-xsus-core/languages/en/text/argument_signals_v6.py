"""Explicit argument-marker extraction without validating argument quality."""
from dataclasses import dataclass
import re
from .structure_v6 import analyze_structure

_PATTERNS = (
    ("premise_marker", re.compile(r"\b(?:because|given that|since)\b", re.I)),
    ("conclusion_marker", re.compile(r"\b(?:therefore|thus|hence)\b", re.I)),
    ("qualification_marker", re.compile(r"\b(?:although|however|unless)\b", re.I)),
    ("evidence_marker", re.compile(r"\b(?:according to|the data show|for example)\b", re.I)),
)

@dataclass(frozen=True, slots=True)
class ArgumentSignalsV6:
    markers: tuple[tuple[int, str, str], ...]
    sentence_count: int
    validates_argument: bool = False
    verifies_evidence: bool = False


def analyze_argument_signals_v6(text: str) -> ArgumentSignalsV6:
    structure = analyze_structure(text)
    markers = []
    for index, sentence in enumerate(structure.sentences):
        for label, pattern in _PATTERNS:
            for match in pattern.finditer(sentence):
                markers.append((index, label, match.group().lower()))
    return ArgumentSignalsV6(tuple(markers), len(structure.sentences))
