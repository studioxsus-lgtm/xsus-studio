"""Experimental temporal metalinguistic cue filtering; opt-in only.

Adds a narrow 'discussed X yesterday' pattern without modifying
Context Guard V6 or existing production analyzers.
"""
from dataclasses import dataclass
import re
from .context_guard_filter_v6 import analyze_context_guard_v6
from .discourse_v6 import analyze_discourse_v6
from .reference_signals_v6 import analyze_reference_signals_v6
from .structure_v6 import analyze_structure

_TEMPORAL_MENTION = re.compile(
    r"\bdiscussed\s+([A-Za-z]+)\s+yesterday\s*[.!?]?\s*$", re.I
)


@dataclass(frozen=True, slots=True)
class TemporalMentionResultV6:
    contrast: bool
    reference: bool
    suppressed: tuple[tuple[int, str, str], ...]
    understands_semantics: bool = False
    production_enabled: bool = False


def analyze_temporal_mention_v6(text: str) -> TemporalMentionResultV6:
    base = analyze_context_guard_v6(text)
    structure = analyze_structure(text)
    suppressed = list(base.suppressed)
    # Preserve the base result when an independent occurrence of a cue
    # remains. Count each occurrence by its exact position.
    ignored = {(index, cue) for index, cue, _ in base.suppressed}
    extra = {}
    for index, sentence in enumerate(structure.sentences):
        match = _TEMPORAL_MENTION.search(sentence)
        if match:
            extra[index] = (match.group(1).lower(), match.start(1))
    contrast = False
    reference = False
    cues = (
        ("contrast", [(i, cue) for i, kind, cue in analyze_discourse_v6(text).explicit_cues if kind == "contrast"]),
        ("reference", list(analyze_reference_signals_v6(text).references)),
    )
    for field, items in cues:
        for index, cue in items:
            sentence = structure.sentences[index]
            for match in re.finditer(r"\b" + re.escape(cue) + r"\b", sentence, re.I):
                temporal = extra.get(index) == (cue, match.start())
                # Existing base suppression is per cue, so preserve its
                # decision unless a new temporal occurrence is identified.
                if temporal:
                    entry = (index, cue, "temporal_indirect_mention")
                    if entry not in suppressed:
                        suppressed.append(entry)
                elif (index, cue) not in ignored:
                    if field == "contrast":
                        contrast = True
                    else:
                        reference = True
    return TemporalMentionResultV6(contrast, reference, tuple(suppressed))
