"""Conservative written-English discourse diagnostics, not semantic understanding.

This module reports only explicit surface cues and adjacent lexical overlap.
It never infers causal truth, coreference, or logical entailment.
"""
from dataclasses import dataclass
import re

from .structure_v6 import analyze_structure

_WORD = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")
_STOP = frozenset({"a", "an", "the", "and", "or", "but", "to", "of", "in",
                   "on", "at", "for", "is", "are", "was", "were", "be", "it",
                   "this", "that", "i", "you", "we", "they", "he", "she",
                   "with", "as", "by", "from", "have", "has", "had"})
_CUES = (
    ("contrast", re.compile(r"\b(?:however|nevertheless|on the other hand)\b", re.I)),
    ("consequence", re.compile(r"\b(?:therefore|consequently|as a result)\b", re.I)),
    ("sequence", re.compile(r"\b(?:first|next|finally)\b", re.I)),
    ("example", re.compile(r"\b(?:for example|for instance)\b", re.I)),
)


@dataclass(frozen=True, slots=True)
class DiscourseDiagnosticsV6:
    sentence_count: int
    explicit_cues: tuple[tuple[int, str, str], ...]
    adjacent_shared_terms: tuple[tuple[int, int, tuple[str, ...]], ...]
    adjacent_without_shared_terms: tuple[tuple[int, int], ...]
    segmentation_uncertain: bool
    lexical_overlap_is_not_coherence: bool = True


def analyze_discourse_v6(text: str) -> DiscourseDiagnosticsV6:
    structure = analyze_structure(text)
    cues = []
    overlap = []
    no_overlap = []
    previous = None
    for index, sentence in enumerate(structure.sentences):
        for label, pattern in _CUES:
            for match in pattern.finditer(sentence):
                cues.append((index, label, match.group().lower()))
        terms = frozenset(word.lower() for word in _WORD.findall(sentence)
                          if word.lower() not in _STOP and len(word) > 2)
        if previous is not None:
            shared = tuple(sorted(previous.intersection(terms)))
            if shared:
                overlap.append((index - 1, index, shared))
            else:
                no_overlap.append((index - 1, index))
        previous = terms
    return DiscourseDiagnosticsV6(
        len(structure.sentences), tuple(cues), tuple(overlap),
        tuple(no_overlap), structure.segmentation_uncertain)
