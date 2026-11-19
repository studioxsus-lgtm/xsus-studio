"""Conservative capitalization edits for analyzed English clauses."""

import re

from ..grammar import IssueCode
from ..linguistics import analyze_english
from .proofreader import Edit

_WORD = re.compile(r"(?<!\w)[A-Za-z]+(?:[-'][A-Za-z]+)*(?!\w)")


def capitalization_edits(text: str) -> tuple[Edit, ...]:
    """Capitalize a verified sentence opening and a verified subject pronoun."""
    analysis = analyze_english(text)
    if analysis is None:
        return ()

    edits = []
    first = re.search(r"[A-Za-z]", text)
    if first is not None and first.start() == len(text) - len(text.lstrip()):
        original = first.group()
        if original.islower():
            edits.append(Edit(first.start(), first.end(), original, original.upper(), IssueCode.CAPITALIZATION))

    subject = analysis.clause.subject
    if subject.head == "i" and subject.text == "i":
        matches = tuple(word for word in _WORD.finditer(text) if word.group() == "i")
        if len(matches) == 1:
            word = matches[0]
            if not any(edit.start == word.start() for edit in edits):
                edits.append(Edit(word.start(), word.end(), "i", "I", IssueCode.CAPITALIZATION))
    return tuple(sorted(edits, key=lambda edit: edit.start))
