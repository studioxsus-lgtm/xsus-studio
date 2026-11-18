"""Compose spelling, article, and verified grammar edits in source coordinates."""

from dataclasses import replace

from ..grammar import GrammarIssue
from .orthography import orthographic_edits
from .proofreader import Edit, ProofreadingResult, ProofreadingStatus, _apply_edits, proofread_sentence

_MAX_CHARS = 2048


def _source_edits(orthographic: tuple[Edit, ...], grammatical: tuple[Edit, ...]) -> list[Edit] | None:
    staged_positions = []
    shift = 0
    for edit in orthographic:
        start = edit.start + shift
        end = start + len(edit.replacement)
        shift += len(edit.replacement) - (edit.end - edit.start)
        staged_positions.append((start, end, shift))

    combined = list(orthographic)
    for edit in grammatical:
        shift = 0
        for start, end, total_shift in staged_positions:
            if edit.end <= start:
                break
            if edit.start < end:
                return None
            shift = total_shift
        combined.append(replace(edit, start=edit.start - shift, end=edit.end - shift))
    combined.sort(key=lambda item: item.start)
    return combined


def copyedit_sentence(text: str) -> ProofreadingResult:
    """Apply only mutually compatible, independently verified sentence edits."""
    if not isinstance(text, str) or len(text) > _MAX_CHARS:
        return proofread_sentence(text)
    orthographic = orthographic_edits(text)
    if not orthographic:
        return proofread_sentence(text)

    staged = _apply_edits(text, orthographic)
    verified = proofread_sentence(staged)
    if verified.status is ProofreadingStatus.REVIEW_REQUIRED:
        return ProofreadingResult(
            ProofreadingStatus.REVIEW_REQUIRED, text, issues=verified.issues,
            review_reason=verified.review_reason,
        )
    edits = _source_edits(orthographic, verified.edits)
    if edits is None or _apply_edits(text, edits) != verified.text:
        return ProofreadingResult(
            ProofreadingStatus.REVIEW_REQUIRED, text, review_reason="overlapping_edits",
        )
    issues = tuple(GrammarIssue(edit.code, edit.original, edit.replacement) for edit in orthographic)
    return ProofreadingResult(ProofreadingStatus.CORRECTED, verified.text, tuple(edits), issues + verified.issues)
