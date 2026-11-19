"""Conservative whitespace corrections around common English punctuation."""

from ..grammar import IssueCode
from .proofreader import Edit

_AFTER_MARKS = frozenset(",;:!?")
_MARKS = frozenset(",;:!?.")


def punctuation_edits(text: str) -> tuple[Edit, ...]:
    """Fix obvious horizontal spacing errors without changing punctuation."""
    edits = []
    index = 0
    while index < len(text):
        mark = text[index]
        if mark not in _MARKS:
            index += 1
            continue

        whitespace_start = index
        while whitespace_start > 0 and text[whitespace_start - 1] in " \t":
            whitespace_start -= 1
        if whitespace_start < index and whitespace_start > 0:
            original = text[whitespace_start:index]
            edits.append(Edit(
                whitespace_start, index, original, "", IssueCode.PUNCTUATION_SPACING,
            ))

        following = index + 1
        if (
            mark in _AFTER_MARKS
            and whitespace_start > 0
            and text[whitespace_start - 1].isalpha()
            and following < len(text)
            and text[following].isalpha()
        ):
            edits.append(Edit(
                following, following, "", " ", IssueCode.PUNCTUATION_SPACING,
            ))
        index += 1
    return tuple(edits)
