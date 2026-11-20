"""Conservative intent classification for short written-English requests.

Classifies only explicit surface patterns. It never executes an instruction.
"""
from dataclasses import dataclass
import re
from .semantic_signals import analyze_semantic_signals

_PATTERNS = (
    ("summarize", re.compile(r"^(?:please\s+)?(?:summarize|summarise)\b", re.I)),
    ("translate", re.compile(r"^(?:please\s+)?translate\b", re.I)),
    ("rewrite", re.compile(r"^(?:please\s+)?(?:rewrite|rephrase)\b", re.I)),
    ("proofread", re.compile(r"^(?:please\s+)?(?:proofread|correct the grammar(?: of| in)?)\b", re.I)),
    ("explain", re.compile(r"^(?:please\s+)?explain\b", re.I)),
    ("clarify", re.compile(r"^(?:please\s+)?clarify\b", re.I)),
)

@dataclass(frozen=True, slots=True)
class IntentResult:
    intent: str
    confidence: str
    evidence: str | None
    requires_clarification: bool

def classify_intent(text: str) -> IntentResult:
    signals = analyze_semantic_signals(text)
    stripped = text.strip()
    for name, pattern in _PATTERNS:
        match = pattern.match(stripped)
        if match:
            remainder = stripped[match.end():].strip(" :.!?")
            return IntentResult(name, "high", match.group(0), not bool(remainder))
    if signals.sentence_type == "question":
        return IntentResult("question", signals.confidence, "?", False)
    return IntentResult("unknown", "low", None, True)
