"""Opt-in conservative context guard for lexical word-sense decisions.

Rejects high-risk cue evidence, not a full negation parser. Existing lexical
engine and production routing are unchanged.
"""
from dataclasses import dataclass
import re

from .word_sense_v1 import WordSenseResult, analyze_word_sense

_WORD = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")
_NEGATORS = frozenset({"not", "never", "neither", "nor", "without", "no"})
_DISCOURSE = frozenset({"but", "however", "instead", "rather"})
_NEGATED_CUE_WINDOW = 3


@dataclass(frozen=True, slots=True)
class GuardedSenseResult:
    target: str
    sense: str | None
    status: str
    confidence: str
    evidence: tuple[str, ...]
    candidates: tuple[str, ...]
    guard_triggered: bool
    guard_reasons: tuple[str, ...]


def analyze_guarded_word_sense(text: str, target: str, *, window: int = 6) -> GuardedSenseResult:
    base = analyze_word_sense(text, target, window=window)
    tokens = tuple(word.casefold() for word in _WORD.findall(text))
    reasons = set()
    if base.status == "resolved":
        # Negation can reverse the apparent meaning of nearby cue words.
        # In v1, abstain rather than attempt a speculative logical rewrite.
        evidence = set(base.evidence)
        for i, token in enumerate(tokens):
            if token in evidence:
                preceding = tokens[max(0, i-_NEGATED_CUE_WINDOW):i]
                if any(neg in preceding for neg in _NEGATORS):
                    reasons.add("negated_evidence")
        # Contrasts with negation are particularly high-risk: e.g.
        # "not a river edge, but a bank for savings".
        if _NEGATORS.intersection(tokens) and _DISCOURSE.intersection(tokens):
            reasons.add("negated_contrast")
    if reasons:
        return GuardedSenseResult(base.target, None, "guarded_abstention", "none", (),
                                  base.candidates, True, tuple(sorted(reasons)))
    return GuardedSenseResult(base.target, base.sense, base.status, base.confidence,
                              base.evidence, base.candidates, False, ())


def compare_guarded_word_sense(text: str, target: str, *, window: int = 6) -> dict:
    """Diagnostic status-only comparison, with no raw user text in output."""
    before = analyze_word_sense(text, target, window=window)
    after = analyze_guarded_word_sense(text, target, window=window)
    return {
        "contract": "future-xsus-core.context-guard-comparison.v1",
        "target": before.target,
        "before_sense": before.sense,
        "after_sense": after.sense,
        "before_status": before.status,
        "after_status": after.status,
        "guard_triggered": after.guard_triggered,
        "guard_reasons": after.guard_reasons,
        "production_authorized": False,
    }
