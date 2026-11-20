"""Bounded, deterministic discourse context for written English.

Only explicit references are tracked. This module does not infer identities or
resolve pronouns to named entities.
"""
from dataclasses import dataclass
from .semantic_signals import analyze_semantic_signals
from .intent_v6 import classify_intent

@dataclass(frozen=True, slots=True)
class TurnSignals:
    index: int
    text: str
    intent: str
    sentence_type: str
    negated: bool
    references_previous_turn: bool

@dataclass(frozen=True, slots=True)
class ContextSummary:
    turns: tuple[TurnSignals, ...]
    latest_intent: str
    unresolved_references: tuple[int, ...]
    truncated: bool

_REFERENCES = frozenset({"it", "that", "this", "those", "these", "they", "them", "previous", "above"})

def analyze_context(messages: list[str] | tuple[str, ...], *, max_turns: int = 12) -> ContextSummary:
    if not isinstance(messages, (list, tuple)):
        raise ValueError("messages must be a list or tuple")
    if not isinstance(max_turns, int) or isinstance(max_turns, bool) or not 1 <= max_turns <= 100:
        raise ValueError("max_turns must be an integer between 1 and 100")
    if len(messages) > 10000:
        raise ValueError("too many messages")
    recent = messages[-max_turns:]
    start = len(messages) - len(recent)
    turns = []
    unresolved = []
    for offset, text in enumerate(recent):
        signals = analyze_semantic_signals(text)
        intent = classify_intent(text)
        index = start + offset
        reference = bool(_REFERENCES.intersection(signals.tokens))
        if reference and index == 0:
            unresolved.append(index)
        turns.append(TurnSignals(index, text, intent.intent, signals.sentence_type, signals.negated, reference))
    return ContextSummary(tuple(turns), turns[-1].intent if turns else "unknown", tuple(unresolved), len(messages) > max_turns)
