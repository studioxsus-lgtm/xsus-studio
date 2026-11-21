"""Conservative structural comparison of explicitly parsed sentence roles."""
from dataclasses import dataclass

from .role_semantics_v1 import classify_sentence_roles


@dataclass(frozen=True, slots=True)
class RoleRelation:
    status: str
    relation: str | None
    same_subject: bool | None
    same_action: bool | None
    same_object: bool | None
    same_polarity: bool | None
    reasons: tuple[str, ...]


def compare_sentence_roles(left_sentence: str, right_sentence: str) -> RoleRelation:
    left = classify_sentence_roles(left_sentence)
    right = classify_sentence_roles(right_sentence)
    if left.status != "resolved" or right.status != "resolved":
        return RoleRelation("abstained", None, None, None, None, None,
                            ("unsupported_role_frame",))
    subject = left.subject == right.subject
    action = left.action == right.action
    obj = left.object == right.object
    polarity = left.polarity == right.polarity
    relation = (
        "same_explicit_roles" if subject and action and obj and polarity
        else "same_roles_opposite_polarity" if subject and action and obj
        else "different_subject" if not subject
        else "different_action" if not action
        else "different_object" if not obj
        else "different_polarity"
    )
    return RoleRelation("resolved", relation, subject, action, obj, polarity, ())


def role_relation_dict(left_sentence: str, right_sentence: str) -> dict:
    result = compare_sentence_roles(left_sentence, right_sentence)
    return {
        "contract": "future-xsus-core.role-relations.v1",
        "status": result.status,
        "relation": result.relation,
        "same_subject": result.same_subject,
        "same_action": result.same_action,
        "same_object": result.same_object,
        "same_polarity": result.same_polarity,
        "reasons": result.reasons,
        "event_identity_proven": False,
        "logical_contradiction_proven": False,
        "production_authorized": False,
    }
