"""Bounded English sentence-continuity cues; never resolves entities."""
from dataclasses import dataclass
import re
from .structure_v6 import analyze_structure

_TOKEN = re.compile(r"\b[A-Za-z]+\b")
_STOP = frozenset({"the", "a", "an", "and", "or", "to", "of", "in", "on",
                   "at", "for", "is", "are", "was", "were", "be", "been",
                   "with", "as", "by", "from", "that", "this", "it", "they",
                   "he", "she", "we", "you", "i", "has", "have", "had"})
_REFERENTIAL = frozenset({"he", "she", "they", "it", "him", "her", "them",
                          "his", "hers", "their", "its", "this", "that",
                          "these", "those"})


@dataclass(frozen=True, slots=True)
class ContinuityLinkV6:
    source_sentence: int
    target_sentence: int
    shared_terms: tuple[str, ...]
    target_reference_cues: tuple[str, ...]
    lexical_link_observed: bool


@dataclass(frozen=True, slots=True)
class ContinuityDiagnosticsV6:
    sentence_count: int
    links: tuple[ContinuityLinkV6, ...]
    segmentation_uncertain: bool
    resolves_referents: bool = False
    establishes_semantic_continuity: bool = False


def analyze_continuity_v6(text: str, *, lookback: int = 2) -> ContinuityDiagnosticsV6:
    if type(lookback) is not int or not 1 <= lookback <= 8:
        raise ValueError("lookback must be an integer from 1 to 8")
    structure = analyze_structure(text)
    sentences = structure.sentences
    terms = []
    references = []
    for sentence in sentences:
        tokens = [word.lower() for word in _TOKEN.findall(sentence)]
        terms.append(frozenset(word for word in tokens if len(word) > 2
                               and word not in _STOP))
        references.append(tuple(word for word in tokens if word in _REFERENTIAL))
    links = []
    for target in range(1, len(sentences)):
        for source in range(max(0, target - lookback), target):
            shared = tuple(sorted(terms[source].intersection(terms[target])))
            links.append(ContinuityLinkV6(
                source, target, shared, references[target], bool(shared)))
    return ContinuityDiagnosticsV6(len(sentences), tuple(links),
                                   structure.segmentation_uncertain)
