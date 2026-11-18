"""Find an explicit link between two candidate independent clauses."""

import re
from dataclasses import dataclass

_COORDINATORS = r"and|but|or|yet|so"
_LINK = re.compile(
    rf"(?P<punct>[,;])(?P<space>[ \t]+)(?:\b(?:{_COORDINATORS})[ \t]+)?"
    rf"|[ \t]+\b(?:{_COORDINATORS})[ \t]+",
    re.IGNORECASE | re.ASCII,
)
_DEPENDENT_START = re.compile(
    r"^[ \t]*(?:after|although|as|because|before|even|except|if|once|provided|since|"
    r"that|though|till|unless|until|when|whenever|where|whereas|wherever|whether|while|"
    r"however|therefore|then|yes|no)\b",
    re.IGNORECASE | re.ASCII,
)
_PROTECTED = re.compile(r"""[\r\n!?()[\]{}"“”‘]|\.(?![ \t]*$)""")


@dataclass(frozen=True, slots=True)
class ClauseLink:
    start: int
    end: int
    comma_splice: bool


def clause_link(text: str) -> ClauseLink | None:
    """Accept one explicit link in a plain sentence without embedded punctuation."""
    if _PROTECTED.search(text):
        return None
    matches = tuple(_LINK.finditer(text))
    if len(matches) != 1:
        return None
    match = matches[0]
    punctuation = match["punct"]
    # Reject extra separators even if they lack the whitespace required by _LINK.
    separator_count = text.count(",") + text.count(";")
    if separator_count != (1 if punctuation else 0):
        return None
    bare_comma = punctuation == "," and match.group() == "," + match["space"]
    if punctuation == ";" and match.group() != ";" + match["space"]:
        return None
    if _DEPENDENT_START.match(text) or _DEPENDENT_START.match(text[match.end():]):
        return None
    return ClauseLink(match.start(), match.end(), bare_comma)
