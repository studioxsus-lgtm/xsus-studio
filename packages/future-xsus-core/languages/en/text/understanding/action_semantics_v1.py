"""Phase 3 opt-in English action taxonomy for a fixed controlled vocabulary.

A structural classification, not a claim of broad lexical semantics or
world truth. Unknown actions abstain.
"""
from dataclasses import dataclass

from .sentence_meaning_v1 import analyze_sentence_meaning

_ACTION_GROUPS = {
    "read": "information_access",
    "review": "information_access",
    "check": "verification",
    "test": "verification",
    "write": "content_creation",
    "create": "content_creation",
    "build": "construction",
    "open": "access",
    "send": "transfer",
    "update": "modification",
    "delete": "removal",
}


@dataclass(frozen=True, slots=True)
class ActionSemanticFrame:
    status: str
    action: str | None
    category: str | None
    polarity: str | None
    reasons: tuple[str, ...]


def classify_action_semantics(sentence: str) -> ActionSemanticFrame:
    frame = analyze_sentence_meaning(sentence)
    if frame.status != "resolved":
        return ActionSemanticFrame("abstained", None, None, None,
                                   ("unsupported_sentence_frame",))
    category = _ACTION_GROUPS.get(frame.action)
    if category is None:
        return ActionSemanticFrame("abstained", None, None, None,
                                   ("unsupported_action_category",))
    return ActionSemanticFrame("resolved", frame.action, category, frame.polarity, ())


def action_semantics_dict(sentence: str) -> dict:
    frame = classify_action_semantics(sentence)
    return {
        "contract": "future-xsus-core.action-semantics.v1",
        "status": frame.status,
        "action": frame.action,
        "category": frame.category,
        "polarity": frame.polarity,
        "reasons": frame.reasons,
        "production_authorized": False,
        "open_domain_semantics_proven": False,
        "world_truth_verified": False,
    }
