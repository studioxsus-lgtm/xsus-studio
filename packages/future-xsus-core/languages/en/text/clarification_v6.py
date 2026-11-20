"""Explainable clarification signals without generating unsupported answers."""
from dataclasses import dataclass
from .intent_v6 import classify_intent
from .context_v6 import analyze_context

@dataclass(frozen=True, slots=True)
class Clarification:
    needed: bool
    reasons: tuple[str, ...]

def assess_clarification(text: str, history: list[str] | tuple[str, ...] = ()) -> Clarification:
    if not isinstance(history, (list, tuple)):
        raise ValueError("history must be a list or tuple")
    intent = classify_intent(text)
    context = analyze_context((*history, text))
    reasons = []
    if intent.requires_clarification:
        reasons.append("missing_or_unrecognized_task")
    if context.unresolved_references:
        reasons.append("reference_without_prior_turn")
    return Clarification(bool(reasons), tuple(reasons))
