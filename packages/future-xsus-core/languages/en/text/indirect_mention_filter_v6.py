"""Experimental narrow indirect-word-mention filtering.

Filters single-word cues after 'mentioned' or 'referred to'; does not
interpret quotations, grammatical roles, or discourse semantics.
"""
from dataclasses import dataclass
import re
from .quotation_filter_v6 import analyze_quotation_filter_v6
from .discourse_v6 import analyze_discourse_v6
from .reference_signals_v6 import analyze_reference_signals_v6
from .structure_v6 import analyze_structure

_INDIRECT = re.compile(r"\b(?:mentioned|referr?ed\s+to)\s+([A-Za-z]+)\b", re.I)


@dataclass(frozen=True, slots=True)
class IndirectMentionFilterV6:
    contrast: bool
    reference: bool
    suppressed: tuple[tuple[int, str, str], ...]
    limited_surface_heuristic: bool = True
    understands_semantics: bool = False


def analyze_indirect_mention_v6(text: str) -> IndirectMentionFilterV6:
    structure = analyze_structure(text)
    baseline = analyze_quotation_filter_v6(text)
    mentions = {}
    for index, sentence in enumerate(structure.sentences):
        mentions[index] = {(m.group(1).lower(), m.start(1)) for m in _INDIRECT.finditer(sentence)}
    suppressed = list(baseline.suppressed)
    existing = {(i, cue) for i, cue, _ in baseline.suppressed}
    contrast, reference = False, False
    for index, label, cue in analyze_discourse_v6(text).explicit_cues:
        if label != "contrast":
            continue
        sentence = structure.sentences[index]
        for match in re.finditer(r"\b" + re.escape(cue) + r"\b", sentence, re.I):
            key = (index, cue)
            if (cue, match.start()) in mentions[index]:
                suppressed.append((index, cue, "indirect_mention"))
            elif key not in existing:
                contrast = True
    for index, cue in analyze_reference_signals_v6(text).references:
        sentence = structure.sentences[index]
        for match in re.finditer(r"\b" + re.escape(cue) + r"\b", sentence, re.I):
            key = (index, cue)
            if (cue, match.start()) in mentions[index]:
                suppressed.append((index, cue, "indirect_mention"))
            elif key not in existing:
                reference = True
    return IndirectMentionFilterV6(contrast, reference, tuple(suppressed))
