"""Apply independently verifiable edits to supported written English clauses."""

import re
from dataclasses import dataclass
from enum import StrEnum

from ..grammar import GrammarIssue, IssueCode
from ..linguistics import analyze_english
from ..syntax import Clause

_WORD = re.compile(r"[A-Za-z]+(?:[-'’][A-Za-z]+)*")
_MAX_CHARS = 2048
_MAX_WORDS = 80


class ProofreadingStatus(StrEnum):
    CORRECTED = "corrected"
    UNCHANGED = "unchanged"
    REVIEW_REQUIRED = "review_required"


@dataclass(frozen=True, slots=True)
class Edit:
    start: int
    end: int
    original: str
    replacement: str
    code: IssueCode


@dataclass(frozen=True, slots=True)
class ProofreadingResult:
    status: ProofreadingStatus
    text: str
    edits: tuple[Edit, ...] = ()
    issues: tuple[GrammarIssue, ...] = ()
    review_reason: str | None = None


def _case(original: str, replacement: str) -> str:
    if replacement == "I" or original == "I":
        return replacement
    if original.isupper():
        return replacement.upper()
    if original.istitle():
        return replacement.capitalize()
    return replacement


def _structure(clause: Clause) -> tuple:
    return (
        clause.lemma, clause.kind, clause.negated, clause.voice, clause.interrogative_role,
        clause.auxiliary.lemma if clause.auxiliary else None,
        clause.object is not None, clause.complement is not None, clause.agent is not None,
    )


def proofread_sentence(sentence: str) -> ProofreadingResult:
    """Return verifiable edits or preserve the sentence for manual review."""
    if not isinstance(sentence, str):
        raise TypeError("sentence must be a string")
    if len(sentence) > _MAX_CHARS:
        return ProofreadingResult(ProofreadingStatus.REVIEW_REQUIRED, sentence, review_reason="input_limit")
    words = tuple(_WORD.finditer(sentence))
    if len(words) > _MAX_WORDS:
        return ProofreadingResult(ProofreadingStatus.REVIEW_REQUIRED, sentence, review_reason="input_limit")

    analysis = analyze_english(sentence)
    if analysis is None:
        return ProofreadingResult(ProofreadingStatus.REVIEW_REQUIRED, sentence, review_reason="unsupported_clause")
    if not analysis.issues:
        return ProofreadingResult(ProofreadingStatus.UNCHANGED, sentence)

    edits = []
    used_positions = set()
    for issue in analysis.issues:
        matches = [word for word in words if word.group().casefold() == issue.observed.casefold()]
        if issue.suggested is None or len(matches) != 1 or matches[0].start() in used_positions:
            return ProofreadingResult(
                ProofreadingStatus.REVIEW_REQUIRED, sentence, issues=analysis.issues, review_reason="ambiguous_edit",
            )
        match = matches[0]
        used_positions.add(match.start())
        original = match.group()
        edits.append(Edit(match.start(), match.end(), original, _case(original, issue.suggested), issue.code))

    output = sentence
    edits.sort(key=lambda edit: edit.start)
    for edit in reversed(edits):
        output = output[:edit.start] + edit.replacement + output[edit.end:]
    verified = analyze_english(output)
    if verified is None or verified.issues or _structure(verified.clause) != _structure(analysis.clause):
        return ProofreadingResult(
            ProofreadingStatus.REVIEW_REQUIRED, sentence, issues=analysis.issues, review_reason="verification_failed",
        )
    return ProofreadingResult(ProofreadingStatus.CORRECTED, output, tuple(edits), analysis.issues)
