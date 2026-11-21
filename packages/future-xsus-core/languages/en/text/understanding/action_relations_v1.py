"""Phase 3 bounded action category comparison, not logical entailment."""
from dataclasses import dataclass

from .action_semantics_v1 import classify_action_semantics


@dataclass(frozen=True, slots=True)
class ActionRelation:
    status: str
    relation: str | None
    same_category: bool | None
    same_action: bool | None
    same_polarity: bool | None
    reasons: tuple[str, ...]


def compare_action_semantics(first: str, second: str) -> ActionRelation:
    left = classify_action_semantics(first)
    right = classify_action_semantics(second)
    if left.status != "resolved" or right.status != "resolved":
        return ActionRelation("abstained", None, None, None,
                              ("unsupported_action_frame",))
    same_action = left.action == right.action
    same_category = left.category == right.category
    same_polarity = left.polarity == right.polarity
    relation = (
        "same_explicit_action" if same_action and same_polarity
        else "same_action_different_polarity" if same_action
        else "same_action_category" if same_category and same_polarity
        else "same_category_different_polarity" if same_category
        else "different_action_categories"
    )
    return ActionRelation("resolved", relation, same_category, same_action,
                          same_polarity, ())


def action_relation_dict(first: str, second: str) -> dict:
    result = compare_action_semantics(first, second)
    return {
        "contract": "future-xsus-core.action-relations.v1",
        "status": result.status,
        "relation": result.relation,
        "same_category": result.same_category,
        "same_action": result.same_action,
        "same_polarity": result.same_polarity,
        "reasons": result.reasons,
        "logical_entailment_proven": False,
        "world_truth_verified": False,
        "production_authorized": False,
    }
