"""Sentence boundary and explicit discourse marker detection.

Lightweight written-English heuristics, not a full syntactic parser.
"""
from dataclasses import dataclass
import re

_BOUNDARY = re.compile(r"(?<=[.!?])\s+(?=[A-Z])")
_MARKERS = {
    "contrast": frozenset({"however", "but", "although", "nevertheless"}),
    "cause": frozenset({"because", "since"}),
    "consequence": frozenset({"therefore", "thus", "consequently"}),
    "sequence": frozenset({"first", "next", "finally", "then"}),
}

@dataclass(frozen=True, slots=True)
class SentenceStructure:
    sentences: tuple[str, ...]
    markers: tuple[tuple[int, str, str], ...]
    segmentation_uncertain: bool

def analyze_structure(text: str) -> SentenceStructure:
    if not isinstance(text, str) or not text.strip() or len(text) > 10000:
        raise ValueError("text must be a nonempty string of at most 10000 characters")
    sentences = tuple(piece.strip() for piece in _BOUNDARY.split(text.strip()) if piece.strip())
    markers = []
    for index, sentence in enumerate(sentences):
        tokens = frozenset(re.findall(r"[a-z]+", sentence.lower()))
        for relation, candidates in _MARKERS.items():
            for marker in sorted(tokens.intersection(candidates)):
                markers.append((index, relation, marker))
    uncertain = bool(re.search(r"\b(?:Mr|Mrs|Dr|Prof)\.", text)) or bool(re.search(r"\b[A-Za-z]\.\s", text))
    return SentenceStructure(sentences, tuple(markers), uncertain)
