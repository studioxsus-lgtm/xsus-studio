"""Experimental mention-aware filtering for explicit English surface cues.

Conservative, rule-based. Only excludes the literal phrase 'the word X';
does not infer semantics or resolve references.
"""
import re
from dataclasses import dataclass
from .discourse_v6 import analyze_discourse_v6
from .reference_signals_v6 import analyze_reference_signals_v6
from .structure_v6 import analyze_structure

_MENTION = re.compile(r"\bthe\s+word\s+([A-Za-z]+)\b", re.I)


@dataclass(frozen=True, slots=True)
class MentionAwareSignalsV6:
    contrast: bool
    reference: bool
    suppressed: tuple[tuple[int, str], ...]
    mention_rule_is_heuristic: bool = True
    understands_quotation: bool = False


def analyze_mention_aware_v6(text: str) -> MentionAwareSignalsV6:
    structure = analyze_structure(text)
    mentions = {}
    for index, sentence in enumerate(structure.sentences):
        mentions[index] = {
            (match.group(1).lower(), match.start(1))
            for match in _MENTION.finditer(sentence)
        }
    suppressed = []
    contrast = False
    reference = False
    discourse = analyze_discourse_v6(text)
    references = analyze_reference_signals_v6(text)
    for index, label, cue in discourse.explicit_cues:
        if label != "contrast":
            continue
        sentence = structure.sentences[index]
        matches = list(re.finditer(r"\b" + re.escape(cue) + r"\b", sentence, re.I))
        if matches and all((cue, match.start()) in mentions[index] for match in matches):
            suppressed.append((index, cue))
        else:
            contrast = True
    for index, cue in references.references:
        sentence = structure.sentences[index]
        matches = list(re.finditer(r"\b" + re.escape(cue) + r"\b", sentence, re.I))
        if matches and all((cue, match.start()) in mentions[index] for match in matches):
            suppressed.append((index, cue))
        else:
            reference = True
    return MentionAwareSignalsV6(contrast, reference, tuple(suppressed))
