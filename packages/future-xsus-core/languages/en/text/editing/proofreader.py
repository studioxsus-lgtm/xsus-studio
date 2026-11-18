"""Apply independently verifiable edits to supported written English clauses."""

import re
from dataclasses import dataclass, replace
from enum import StrEnum

from ..grammar import GrammarIssue, IssueCode
from ..linguistics import ClauseAnalysis, analyze_english
from ..syntax import Clause, ClauseKind
from .compounds import clause_link
from .dependents import DependentLink, dependent_link, review_dependent_clause, starts_dependent

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

    if (dependent := dependent_link(sentence)) is not None:
        result = _proofread_linked(sentence, dependent.parts, dependent=dependent)
        if result is not None:
            return result
        return ProofreadingResult(ProofreadingStatus.REVIEW_REQUIRED, sentence, review_reason="unsupported_clause")

    analysis = analyze_english(sentence)
    if analysis is not None and (not starts_dependent(sentence) or analysis.clause.kind is ClauseKind.QUESTION):
        return _proofread_clause(sentence, analysis, words)
    compound = _proofread_compound(sentence)
    if compound is not None:
        return compound
    return ProofreadingResult(ProofreadingStatus.REVIEW_REQUIRED, sentence, review_reason="unsupported_clause")


def _proofread_clause(
    sentence: str, analysis: ClauseAnalysis, words: tuple[re.Match[str], ...],
) -> ProofreadingResult:
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

    edits.sort(key=lambda edit: edit.start)
    output = _apply_edits(sentence, edits)
    verified = analyze_english(output)
    if verified is None or verified.issues or _structure(verified.clause) != _structure(analysis.clause):
        return ProofreadingResult(
            ProofreadingStatus.REVIEW_REQUIRED, sentence, issues=analysis.issues, review_reason="verification_failed",
        )
    return ProofreadingResult(ProofreadingStatus.CORRECTED, output, tuple(edits), analysis.issues)


def _apply_edits(text: str, edits: list[Edit]) -> str:
    for edit in reversed(edits):
        text = text[:edit.start] + edit.replacement + text[edit.end:]
    return text


def _proofread_compound(sentence: str) -> ProofreadingResult | None:
    link = clause_link(sentence)
    if link is None:
        return None
    return _proofread_linked(
        sentence, ((0, link.start), (link.end, len(sentence))),
        comma_splice=link.start if link.comma_splice else None,
    )


def _proofread_linked(
    sentence: str, parts: tuple[tuple[int, int], tuple[int, int]], *,
    comma_splice: int | None = None, dependent: DependentLink | None = None,
) -> ProofreadingResult | None:
    edits = []
    issues = []
    for index, (offset, end) in enumerate(parts):
        text = sentence[offset:end]
        analysis = analyze_english(text)
        if analysis is None or analysis.clause.kind is not ClauseKind.DECLARATIVE:
            return None
        if dependent is not None:
            reason = review_dependent_clause(dependent, index, analysis.clause)
            if reason is not None:
                return ProofreadingResult(ProofreadingStatus.REVIEW_REQUIRED, sentence, review_reason=reason)
        result = _proofread_clause(text, analysis, tuple(_WORD.finditer(text)))
        if result.status is ProofreadingStatus.REVIEW_REQUIRED:
            return ProofreadingResult(
                ProofreadingStatus.REVIEW_REQUIRED, sentence,
                issues=result.issues, review_reason=result.review_reason,
            )
        edits.extend(replace(edit, start=edit.start + offset, end=edit.end + offset) for edit in result.edits)
        issues.extend(result.issues)
    if comma_splice is not None:
        edits.append(Edit(comma_splice, comma_splice + 1, ",", ";", IssueCode.COMMA_SPLICE))
        issues.append(GrammarIssue(IssueCode.COMMA_SPLICE, ",", ";"))
    edits.sort(key=lambda edit: edit.start)
    if not edits:
        return ProofreadingResult(ProofreadingStatus.UNCHANGED, sentence)
    return ProofreadingResult(
        ProofreadingStatus.CORRECTED, _apply_edits(sentence, edits), tuple(edits), tuple(issues),
    )
