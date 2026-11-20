"""Conservative English reference cues; no automatic coreference resolution."""
from dataclasses import dataclass
import re
from .structure_v6 import analyze_structure

_REFERENCES = frozenset({"he", "she", "they", "it", "him", "her", "them",
                          "his", "hers", "their", "its", "this", "that",
                          "these", "those"})
_TOKEN = re.compile(r"\b[A-Za-z]+\b")


@dataclass(frozen=True, slots=True)
class ReferenceSignalsV6:
    references: tuple[tuple[int, str], ...]
    opening_sentence_references: tuple[str, ...]
    segmentation_uncertain: bool
    resolves_referents: bool = False


def analyze_reference_signals_v6(text: str) -> ReferenceSignalsV6:
    structure = analyze_structure(text)
    found = []
    opening = []
    for index, sentence in enumerate(structure.sentences):
        for match in _TOKEN.finditer(sentence):
            word = match.group().lower()
            if word in _REFERENCES:
                found.append((index, word))
                if index == 0:
                    opening.append(word)
    return ReferenceSignalsV6(tuple(found), tuple(opening),
                              structure.segmentation_uncertain)
