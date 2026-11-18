"""Curated corrections for written English forms with high confidence."""

import re

from ..grammar import IssueCode
from .proofreader import Edit, _case

_WORD = re.compile(r"(?<!\w)[A-Za-z]+(?:[-'’][A-Za-z]+)*(?!\w)")
_TYPOS = {
    "teh": "the", "thier": "their",
    "recieve": "receive", "recieved": "received", "reciept": "receipt",
    "mesage": "message", "studnet": "student", "propsoal": "proposal",
    "lable": "label", "chekc": "check", "chekced": "checked",
    "wriet": "write", "wrtie": "write", "invioce": "invoice",
    "floder": "folder", "budegt": "budget",
}
_VOWEL_SOUND = frozenset({
    "agenda", "answer", "early", "engine", "heir", "honest", "honor",
    "hour", "invoice", "old",
})
_CONSONANT_SOUND = frozenset({
    "badge", "budget", "calendar", "child", "class", "clear", "colleague",
    "copy", "deer", "dog", "draft", "european", "file", "final", "folder",
    "form", "friend", "good", "happy", "label", "late", "link", "man",
    "meeting", "message", "model", "mouse", "new", "note", "one",
    "person", "plan", "proposal", "ready", "receipt", "report", "request",
    "revised", "sheep", "short", "slide", "small", "student", "summary",
    "teacher", "ticket", "time", "uniform", "unit", "university", "user",
    "woman", "young",
})


def orthographic_edits(text: str) -> tuple[Edit, ...]:
    words = tuple(_WORD.finditer(text))
    edits = []
    for index, word in enumerate(words):
        original = word.group()
        lower = original.lower()
        replacement = _TYPOS.get(lower)
        if replacement is not None and (original.islower() or (index == 0 and original.istitle())):
            edits.append(Edit(word.start(), word.end(), original, _case(original, replacement), IssueCode.SPELLING))
            continue
        if lower not in {"a", "an"} or index + 1 >= len(words):
            continue
        next_word = words[index + 1]
        if not text[word.end():next_word.start()].isspace():
            continue
        spelled = next_word.group()
        # Capitalized and mixed-case tokens can be unfamiliar names or abbreviations.
        if spelled != spelled.lower() and spelled != "European":
            continue
        spoken = _TYPOS.get(spelled.lower(), spelled.lower())
        desired = "an" if spoken in _VOWEL_SOUND else "a" if spoken in _CONSONANT_SOUND else None
        if desired is not None and desired != lower:
            # Initial "A" is normally sentence case when the next word is lowercase.
            replacement = "An" if original == "A" and index == 0 else _case(original, desired)
            edits.append(Edit(word.start(), word.end(), original, replacement, IssueCode.ARTICLE_SOUND))
    return tuple(edits)
