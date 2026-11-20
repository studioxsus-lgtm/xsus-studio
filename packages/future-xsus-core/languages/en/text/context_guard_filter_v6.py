"""Conservative opt-in context guard for indirect word mentions.

Retains a cue when an indirect-mention verb is followed by a clause;
suppresses only narrowly recognized metalinguistic contexts.
"""
from dataclasses import dataclass
import re
from .quotation_filter_v6 import analyze_quotation_filter_v6
from .discourse_v6 import analyze_discourse_v6
from .reference_signals_v6 import analyze_reference_signals_v6
from .structure_v6 import analyze_structure

_CONTEXT = re.compile(
    r"\b(?:mentioned|referred\s+to|discussed)\s+([A-Za-z]+)"
    r"(?=\s+(?:in\s+class|on\s+(?:the\s+)?board)\b|\s*[.!?]\s*$)", re.I
)
_WORD = re.compile(r"\bthe\s+word\s+([A-Za-z]+)\b", re.I)
_QUOTES = re.compile(r'\"([^"\n]*)\"|“([^”\n]*)”|‘([^’\n]*)’')


@dataclass(frozen=True, slots=True)
class ContextGuardResultV6:
    contrast: bool
    reference: bool
    suppressed: tuple[tuple[int, str, str], ...]
    narrow_heuristic: bool = True
    understands_semantics: bool = False


def _suppression(sentence, cue, position):
    for m in _WORD.finditer(sentence):
        if m.group(1).lower() == cue and m.start(1) == position:
            return "word_mention"
    for m in _CONTEXT.finditer(sentence):
        if m.group(1).lower() == cue and m.start(1) == position:
            return "guarded_indirect_mention"
    for m in _QUOTES.finditer(sentence):
        content = next((x for x in m.groups() if x is not None), "")
        if content.strip().lower() == cue and m.start() < position < m.end():
            return "isolated_quotation"
    return None


def analyze_context_guard_v6(text: str) -> ContextGuardResultV6:
    structure = analyze_structure(text)
    contrast = reference = False
    suppressed = []
    contrast_cues = [(i, cue) for i, label, cue in analyze_discourse_v6(text).explicit_cues
                     if label == "contrast"]
    reference_cues = list(analyze_reference_signals_v6(text).references)
    for field, cues in (("contrast", contrast_cues), ("reference", reference_cues)):
        for index, cue in cues:
            sentence = structure.sentences[index]
            for m in re.finditer(r"\b" + re.escape(cue) + r"\b", sentence, re.I):
                reason = _suppression(sentence, cue, m.start())
                if reason:
                    suppressed.append((index, cue, reason))
                elif field == "contrast":
                    contrast = True
                else:
                    reference = True
    return ContextGuardResultV6(contrast, reference, tuple(suppressed))
