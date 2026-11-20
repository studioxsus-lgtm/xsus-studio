"""Conservative, dependency-free semantic signals for written English.

This module does not claim open-domain understanding. Unsupported inputs remain
unclassified; callers must not treat a signal as a verified fact.
"""
from dataclasses import dataclass
import re

_WORD = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")
_NEGATORS = frozenset({"not", "never", "no", "neither", "nor", "cannot"})
_QUESTION_WORDS = frozenset({"who", "what", "when", "where", "why", "how", "which", "whose", "whom"})
_AUXILIARIES = frozenset({"am", "is", "are", "was", "were", "do", "does", "did", "can", "could", "will", "would", "should", "have", "has", "had", "may", "might", "must", "shall"})
_CONTRACTIONS = {"don't", "doesn't", "didn't", "isn't", "aren't", "wasn't", "weren't", "can't", "couldn't", "won't", "wouldn't", "shouldn't", "haven't", "hasn't", "hadn't", "mustn't"}

@dataclass(frozen=True, slots=True)
class SemanticSignals:
    text: str
    tokens: tuple[str, ...]
    sentence_type: str
    negated: bool
    question_word: str | None
    confidence: str

def analyze_semantic_signals(text: str) -> SemanticSignals:
    """Extract explicitly observable signals without inventing an interpretation.

    Raises ValueError for non-string, empty or excessively long inputs.
    """
    if not isinstance(text, str):
        raise ValueError("text must be a string")
    if not text.strip() or len(text) > 10000:
        raise ValueError("text must contain 1 to 10000 characters")
    tokens = tuple(word.lower() for word in _WORD.findall(text))
    if not tokens:
        return SemanticSignals(text, (), "unknown", False, None, "low")
    first = tokens[0]
    question = text.rstrip().endswith("?")
    question_word = first if question and first in _QUESTION_WORDS else None
    sentence_type = "question" if question else "statement"
    if question and (question_word or first in _AUXILIARIES):
        confidence = "high"
    elif question:
        confidence = "low"
    else:
        confidence = "medium"
    negated = bool(_NEGATORS.intersection(tokens) or _CONTRACTIONS.intersection(tokens))
    return SemanticSignals(text, tokens, sentence_type, negated, question_word, confidence)
