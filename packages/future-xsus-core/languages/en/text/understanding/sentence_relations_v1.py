"""Phase 2 opt-in structural sentence relation comparison.

Only compares bounded, explicitly parsed frames. Does not assert real-world
truth, entailment, contradiction, or broad semantic equivalence.
"""
from dataclasses import dataclass

from .sentence_meaning_v1 import analyze_sentence_meaning


@dataclass(frozen=True, slots=True)
class SentenceRelation:
    status: str
    relation: str | None
    subject_match: bool | None
    action_match: bool | None
    object_match: bool | None
    polarity_match: bool | None
    reasons: tuple[str, ...]


def compare_sentence_frames(first: str, second: str) -> SentenceRelation:
    left = analyze_sentence_meaning(first)
    right = analyze_sentence_meaning(second)
    if left.status != "resolved" or right.status != "resolved":
        return SentenceRelation("abstained", None, None, None, None, None,
                                ("unsupported_input_frame",))
    subject_match = left.subject == right.subject
    action_match = left.action == right.action
    object_match = left.object == right.object
    polarity_match = left.polarity == right.polarity
    if subject_match and action_match and object_match:
        relation = "same_explicit_frame" if polarity_match else "opposite_explicit_polarity"
    elif action_match and object_match and polarity_match:
        relation = "different_explicit_subject"
    elif subject_match and object_match and polarity_match:
        relation = "different_explicit_action"
    elif subject_match and action_match and polarity_match:
        relation = "different_explicit_object"
    else:
        relation = "different_explicit_frames"
    return SentenceRelation("resolved", relation, subject_match, action_match,
                            object_match, polarity_match, ())


def compare_sentence_frames_dict(first: str, second: str) -> dict:
    result = compare_sentence_frames(first, second)
    return {
        "contract": "future-xsus-core.sentence-relations.v1",
        "status": result.status,
        "relation": result.relation,
        "subject_match": result.subject_match,
        "action_match": result.action_match,
        "object_match": result.object_match,
        "polarity_match": result.polarity_match,
        "reasons": result.reasons,
        "logical_contradiction_proven": False,
        "world_truth_verified": False,
        "production_authorized": False,
    }
