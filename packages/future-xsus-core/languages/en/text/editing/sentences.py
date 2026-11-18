"""Conservative original-text spans for written English paragraphs."""

import re
from collections.abc import Iterator

_MARKERS = re.compile(r"""[.!?]+|\r?\n[ \t]*\r?\n|[()"\[\]{}'“”‘’]""")
_ABBREVIATION = re.compile(r"(?:[A-Za-z]+\.)+$")
_COMMON = frozenset({
    "mr.", "mrs.", "ms.", "dr.", "prof.", "sr.", "jr.", "st.", "vs.", "etc.",
    "a.m.", "p.m.", "e.g.", "i.e.", "no.", "fig.", "dept.", "approx.", "inc.", "ltd.",
})
_BRACKETS = {"(": ")", "[": "]", "{": "}"}
_QUOTES = {'"': '"', "“": "”", "‘": "’", "'": "'"}


def _looks_abbreviated(text: str, start: int, end: int) -> bool:
    match = _ABBREVIATION.search(text, max(start, end - 32), end)
    if match is None:
        return False
    ending = match.group()
    return (
        ending.casefold() in _COMMON
        or ending.count(".") > 1
        or (len(ending) == 2 and ending[0].isupper())
    )


def sentence_spans(text: str) -> Iterator[tuple[int, int]]:
    """Yield supported boundary candidates without altering any input characters."""
    start = 0
    brackets: list[str] = []
    quote = None
    for marker in _MARKERS.finditer(text):
        value = marker.group()
        left, right = marker.span()
        preceding = text[left - 1:left]
        following = text[right:right + 1]
        if quote is not None:
            if value == quote and (value not in {"'", "’"} or not following.isalnum()):
                quote = None
            continue
        if value in _QUOTES and (value != "'" or (not preceding.isalnum() and following.isalnum())):
            quote = _QUOTES[value]
        elif value in _BRACKETS:
            brackets.append(_BRACKETS[value])
        elif brackets and value == brackets[-1]:
            brackets.pop()
        elif not brackets:
            if "\n" in value:
                if text[start:left].strip():
                    yield start, left
                start = right
            elif value[0] in ".!?" and (not following or following.isspace()):
                if value == "." and _looks_abbreviated(text, start, right):
                    continue
                if value.startswith(".."):
                    continue
                if text[start:right].strip():
                    yield start, right
                start = right
    if text[start:].strip():
        yield start, len(text)
