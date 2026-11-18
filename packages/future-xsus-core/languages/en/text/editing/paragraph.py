"""Proofread individual clauses within a paragraph and retain original offsets."""

from dataclasses import dataclass, replace
from enum import StrEnum

from .copyedit import copyedit_sentence
from .proofreader import Edit, ProofreadingStatus, proofread_sentence
from .sentences import sentence_spans

_MAX_CHARS = 8192
_MAX_SEGMENTS = 128


class ParagraphStatus(StrEnum):
    CORRECTED = "corrected"
    UNCHANGED = "unchanged"
    PARTIAL = "partial"
    REVIEW_REQUIRED = "review_required"


@dataclass(frozen=True, slots=True)
class Passage:
    start: int
    end: int
    status: ProofreadingStatus
    review_reason: str | None


@dataclass(frozen=True, slots=True)
class ParagraphResult:
    status: ParagraphStatus
    text: str
    passages: tuple[Passage, ...] = ()
    edits: tuple[Edit, ...] = ()
    review_reason: str | None = None


def proofread_paragraph(text: str, *, orthography: bool = False) -> ParagraphResult:
    if not isinstance(text, str):
        raise TypeError("text must be a string")
    if len(text) > _MAX_CHARS:
        return ParagraphResult(ParagraphStatus.REVIEW_REQUIRED, text, review_reason="input_limit")
    spans = tuple(sentence_spans(text))
    if not spans or len(spans) > _MAX_SEGMENTS:
        reason = "empty_input" if not spans else "input_limit"
        return ParagraphResult(ParagraphStatus.REVIEW_REQUIRED, text, review_reason=reason)

    passages = []
    edits = []
    pieces = []
    cursor = 0
    edit_sentence = copyedit_sentence if orthography else proofread_sentence
    for start, end in spans:
        result = edit_sentence(text[start:end])
        passages.append(Passage(start, end, result.status, result.review_reason))
        edits.extend(replace(edit, start=edit.start + start, end=edit.end + start) for edit in result.edits)
        pieces.extend((text[cursor:start], result.text))
        cursor = end
    pieces.append(text[cursor:])

    needs_review = any(item.status is ProofreadingStatus.REVIEW_REQUIRED for item in passages)
    if needs_review:
        status = ParagraphStatus.PARTIAL if edits else ParagraphStatus.REVIEW_REQUIRED
    else:
        status = ParagraphStatus.CORRECTED if edits else ParagraphStatus.UNCHANGED
    return ParagraphResult(status, "".join(pieces), tuple(passages), tuple(edits))
