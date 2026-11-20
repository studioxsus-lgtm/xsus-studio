"""Surface ambiguity flags only; not a general ambiguity detector."""
from dataclasses import dataclass
import re
from .structure_v6 import analyze_structure

_HEDGES = re.compile(r"\b(?:maybe|perhaps|possibly|probably)\b", re.I)
_UNCERTAIN = re.compile(r"\b(?:might|could|may)\b", re.I)
_VAGUE = re.compile(r"\b(?:something|someone|somewhere|somehow)\b", re.I)


@dataclass(frozen=True, slots=True)
class AmbiguitySignalsV6:
    cues: tuple[tuple[int, str, str], ...]
    sentence_count: int
    detects_all_ambiguity: bool = False


def analyze_ambiguity_signals_v6(text: str) -> AmbiguitySignalsV6:
    structure = analyze_structure(text)
    cues = []
    for index, sentence in enumerate(structure.sentences):
        for label, pattern in (("hedge", _HEDGES),
                               ("modal_uncertainty", _UNCERTAIN),
                               ("vague_reference", _VAGUE)):
            for match in pattern.finditer(sentence):
                cues.append((index, label, match.group().lower()))
    return AmbiguitySignalsV6(tuple(cues), len(structure.sentences))
