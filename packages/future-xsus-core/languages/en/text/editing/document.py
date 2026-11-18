"""Proofread Markdown prose while preserving protected document regions."""

import re
from dataclasses import dataclass, replace

from .markdown_blocks import markdown_blocks
from .paragraph import ParagraphStatus, proofread_paragraph
from .proofreader import Edit

_MAX_CHARS = 65_536
_MAX_BLOCKS = 512
_LINEBREAK = re.compile(r"\r\n|\r|\n")


@dataclass(frozen=True, slots=True)
class DocumentSection:
    start: int
    end: int
    kind: str
    status: ParagraphStatus | None
    review_reason: str | None = None


@dataclass(frozen=True, slots=True)
class DocumentResult:
    status: ParagraphStatus
    text: str
    sections: tuple[DocumentSection, ...] = ()
    edits: tuple[Edit, ...] = ()
    review_reason: str | None = None


def proofread_markdown(text: str, *, orthography: bool = False) -> DocumentResult:
    """Apply only verified prose edits, using offsets into the original document."""
    if not isinstance(text, str):
        raise TypeError("text must be a string")
    if len(text) > _MAX_CHARS:
        return DocumentResult(ParagraphStatus.REVIEW_REQUIRED, text, review_reason="input_limit")
    blocks = tuple(markdown_blocks(text))
    if len(blocks) > _MAX_BLOCKS:
        return DocumentResult(ParagraphStatus.REVIEW_REQUIRED, text, review_reason="input_limit")

    sections = []
    edits = []
    for block in blocks:
        if block.kind != "prose":
            sections.append(DocumentSection(block.start, block.end, block.kind, None))
            continue
        prose = text[block.start:block.end]
        # Markdown folds soft line breaks; matched offsets retain the original width.
        flat = _LINEBREAK.sub(lambda match: " " * len(match.group()), prose)
        result = proofread_paragraph(flat, orthography=orthography)
        sections.append(DocumentSection(block.start, block.end, "prose", result.status, result.review_reason))
        edits.extend(replace(edit, start=edit.start + block.start, end=edit.end + block.start) for edit in result.edits)

    output = []
    cursor = 0
    for edit in edits:
        output.extend((text[cursor:edit.start], edit.replacement))
        cursor = edit.end
    output.append(text[cursor:])
    needs_review = any(section.status in {ParagraphStatus.PARTIAL, ParagraphStatus.REVIEW_REQUIRED} for section in sections)
    if needs_review:
        status = ParagraphStatus.PARTIAL if edits else ParagraphStatus.REVIEW_REQUIRED
    else:
        status = ParagraphStatus.CORRECTED if edits else ParagraphStatus.UNCHANGED
    return DocumentResult(status, "".join(output), tuple(sections), tuple(edits))
