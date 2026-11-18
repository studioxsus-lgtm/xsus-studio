"""Recognize bounded dependent clauses without altering connector punctuation."""

import re
from dataclasses import dataclass

from ..syntax import Clause, Number

_MARKER = re.compile(r"\b(?:because|although|if|unless|while|when|before|after)\b", re.IGNORECASE | re.ASCII)
_PROTECTED = re.compile(r"""[\r\n!?;()[\]{}"“”‘]|\.(?![ \t]*$)""")
_PREFIX_WITH_COMMA = re.compile(r",[ \t]+")
_SPACE = re.compile(r"[ \t]+")
_EMBEDDED_QUESTION_VERBS = frozenset({
    "ask", "check", "choose", "decide", "explain", "find", "forget", "hear", "know",
    "learn", "remember", "say", "see", "show", "tell", "understand", "wonder",
})


@dataclass(frozen=True, slots=True)
class DependentLink:
    parts: tuple[tuple[int, int], tuple[int, int]]
    dependent_index: int
    marker: str


def starts_dependent(text: str) -> bool:
    return _MARKER.match(text.lstrip()) is not None


def dependent_link(text: str) -> DependentLink | None:
    """Find one explicit subordinator and two nonempty original-text spans."""
    if _PROTECTED.search(text):
        return None
    markers = tuple(_MARKER.finditer(text))
    if len(markers) != 1:
        return None
    marker = markers[0]
    after = _SPACE.match(text, marker.end())
    if after is None:
        return None
    prefix = text[:marker.start()]
    if not prefix.strip():
        comma = _PREFIX_WITH_COMMA.search(text, after.end())
        if comma is None or text.count(",") != 1:
            return None
        parts = ((after.end(), comma.start()), (comma.end(), len(text)))
        dependent_index = 0
    else:
        if not prefix[-1:].isspace():
            return None
        main = prefix.rstrip(" \t")
        if main.endswith(","):
            main = main[:-1]
        if "," in main or "," in text[after.end():]:
            return None
        parts = ((0, len(main)), (after.end(), len(text)))
        dependent_index = 1
    if not all(text[start:end].strip() for start, end in parts):
        return None
    return DependentLink(parts, dependent_index, marker.group().lower())


def review_dependent_clause(link: DependentLink, index: int, clause: Clause) -> str | None:
    """Decline readings indistinguishable from a supported grammatical construction."""
    if link.dependent_index == index and link.marker in {"if", "unless"}:
        finite = clause.auxiliary.text if clause.auxiliary else clause.verb
        subject = clause.subject
        if finite.lower() == "were" and subject.number is Number.SINGULAR and subject.person != 2:
            return "possible_irrealis"
    if link.dependent_index == 1 and index == 0 and link.marker in {"if", "when"}:
        indirect_object_possible = clause.lemma in {"ask", "tell", "show"}
        if clause.lemma in _EMBEDDED_QUESTION_VERBS and (clause.object is None or indirect_object_possible):
            return "possible_embedded_question"
    return None
