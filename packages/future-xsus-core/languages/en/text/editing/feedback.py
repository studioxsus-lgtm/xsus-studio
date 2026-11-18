"""Explain verified edits using concise English grammar guidance."""

from collections.abc import Sequence

from ..grammar import IssueCode
from .proofreader import Edit

_EXPLANATIONS = {
    IssueCode.SUBJECT_VERB_AGREEMENT: "Make the finite verb agree with its subject.",
    IssueCode.AUXILIARY_VERB_FORM: "Use the verb form required by the auxiliary.",
    IssueCode.PRONOUN_CASE: "Use the pronoun form required by its role in the clause.",
    IssueCode.DETERMINER_NUMBER: "Use a determiner that matches the noun's number.",
    IssueCode.SPELLING: "Use the standard spelling of this word.",
    IssueCode.ARTICLE_SOUND: "Choose a or an by the sound of the following word.",
    IssueCode.COMMA_SPLICE: "A semicolon can join two independent clauses without a conjunction.",
}
_MAX_EXPLAINED = 8


def explain_edits(edits: Sequence[Edit]) -> str:
    if not edits:
        return ""
    explanations = [
        f"- {edit.original!r} → {edit.replacement!r}. {_EXPLANATIONS[edit.code]}"
        for edit in edits[:_MAX_EXPLAINED]
    ]
    if len(edits) > _MAX_EXPLAINED:
        explanations.append(f"- {len(edits) - _MAX_EXPLAINED} additional edits applied.")
    return "\n\nChanges:\n" + "\n".join(explanations)


_REVIEW_EXPLANATIONS = {
    "overlapping_edits": "The proposed spelling and grammar edits overlap, so the original wording is preserved.",
    "possible_irrealis": "In a hypothetical condition, 'were' can be valid with a singular subject.",
    "possible_embedded_question": "The clause may be an embedded question, so its structure needs review.",
}


def explain_review(reasons: Sequence[str | None]) -> str:
    notes = [_REVIEW_EXPLANATIONS[reason] for reason in dict.fromkeys(reasons) if reason in _REVIEW_EXPLANATIONS]
    return "\n\nReview notes:\n- " + "\n- ".join(notes) if notes else ""
