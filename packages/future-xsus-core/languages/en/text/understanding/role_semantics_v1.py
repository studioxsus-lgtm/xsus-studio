"""Phase 3.3 opt-in explicit subject/action/object role classification.

Roles reflect surface grammar only. No real-world agency, ownership, entity
resolution, reference linking, or semantic truth is inferred.
"""
from dataclasses import dataclass

from .sentence_meaning_v1 import analyze_sentence_meaning

_SUBJECT_KINDS = {
    "i": "first_person_pronoun", "we": "first_person_pronoun",
    "you": "second_person_pronoun",
    "he": "third_person_pronoun", "she": "third_person_pronoun",
    "they": "third_person_pronoun",
    "the user": "explicit_nominal", "the teacher": "explicit_nominal",
    "the student": "explicit_nominal", "the developer": "explicit_nominal",
    "the engine": "explicit_nominal", "the model": "explicit_nominal",
    "the system": "explicit_nominal",
}
_OBJECT_KINDS = {
    "the report": "definite_object", "the file": "definite_object",
    "the project": "definite_object", "the code": "definite_object",
    "the message": "definite_object", "the document": "definite_object",
    "the application": "definite_object", "the test": "definite_object",
    "the model": "definite_object", "the plan": "definite_object",
    "a report": "indefinite_object", "a file": "indefinite_object",
    "a project": "indefinite_object", "a message": "indefinite_object",
    "a document": "indefinite_object", "a test": "indefinite_object",
}


@dataclass(frozen=True, slots=True)
class RoleSemanticFrame:
    status: str
    subject: str | None
    subject_kind: str | None
    action: str | None
    object: str | None
    object_kind: str | None
    polarity: str | None
    reasons: tuple[str, ...]


def classify_sentence_roles(sentence: str) -> RoleSemanticFrame:
    frame = analyze_sentence_meaning(sentence)
    if frame.status != "resolved":
        return RoleSemanticFrame("abstained", None, None, None, None, None, None,
                                 ("unsupported_sentence_frame",))
    subject_kind = _SUBJECT_KINDS.get(frame.subject)
    object_kind = _OBJECT_KINDS.get(frame.object)
    if subject_kind is None or object_kind is None:
        return RoleSemanticFrame("abstained", None, None, None, None, None, None,
                                 ("unsupported_role_kind",))
    return RoleSemanticFrame("resolved", frame.subject, subject_kind, frame.action,
                             frame.object, object_kind, frame.polarity, ())


def sentence_roles_dict(sentence: str) -> dict:
    frame = classify_sentence_roles(sentence)
    return {
        "contract": "future-xsus-core.sentence-roles.v1",
        "status": frame.status,
        "subject": frame.subject,
        "subject_kind": frame.subject_kind,
        "action": frame.action,
        "object": frame.object,
        "object_kind": frame.object_kind,
        "polarity": frame.polarity,
        "reasons": frame.reasons,
        "real_world_agent_verified": False,
        "entity_coreference_proven": False,
        "production_authorized": False,
    }
