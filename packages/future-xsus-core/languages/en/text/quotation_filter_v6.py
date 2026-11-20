"""Opt-in filtering of literal quoted cue words, not quoted speech."""
from dataclasses import dataclass
import re

from .discourse_v6 import analyze_discourse_v6
from .reference_signals_v6 import analyze_reference_signals_v6
from .structure_v6 import analyze_structure

_MENTION = re.compile(r"\bthe\s+word\s+([A-Za-z]+)\b", re.I)
_QUOTES = re.compile(r'"([^"\n]*)"|“([^”\n]*)”|‘([^’\n]*)’')


@dataclass(frozen=True, slots=True)
class QuotationFilterV6:
    contrast: bool
    reference: bool
    suppressed: tuple[tuple[int, str, str], ...]
    unmatched_quote_uncertain: bool
    understands_quoted_speech: bool = False
    resolves_referents: bool = False


def _suppressed(sentence: str, cue: str, start: int) -> str | None:
    for match in _MENTION.finditer(sentence):
        if match.group(1).lower() == cue and match.start(1) == start:
            return "word_mention"
    for match in _QUOTES.finditer(sentence):
        inner = match.group(1) if match.group(1) is not None else (
            match.group(2) if match.group(2) is not None else match.group(3))
        if inner.strip().lower() != cue:
            continue
        if match.start() < start < match.end():
            return "isolated_quotation"
    return None


def analyze_quotation_filter_v6(text: str) -> QuotationFilterV6:
    structure = analyze_structure(text)
    contrast = False
    reference = False
    suppressed = []
    for index, label, cue in analyze_discourse_v6(text).explicit_cues:
        if label != "contrast":
            continue
        sentence = structure.sentences[index]
        for match in re.finditer(r"\b" + re.escape(cue) + r"\b", sentence, re.I):
            reason = _suppressed(sentence, cue, match.start())
            if reason:
                suppressed.append((index, cue, reason))
            else:
                contrast = True
    for index, cue in analyze_reference_signals_v6(text).references:
        sentence = structure.sentences[index]
        for match in re.finditer(r"\b" + re.escape(cue) + r"\b", sentence, re.I):
            reason = _suppressed(sentence, cue, match.start())
            if reason:
                suppressed.append((index, cue, reason))
            else:
                reference = True
    # An odd number of straight double quotes indicates incomplete pairing.
    # Curly quotes are reported uncertain if opening/closing counts differ.
    uncertain = (text.count('"') % 2 != 0
                 or text.count('“') != text.count('”')
                 or text.count('‘') != text.count('’'))
    return QuotationFilterV6(contrast, reference, tuple(suppressed), uncertain)
