"""Curated corrections for written English forms with high confidence."""

import json
import re
from pathlib import Path

from ..grammar import IssueCode
from .proofreader import Edit, _case

_WORD = re.compile(r"(?<!\w)[A-Za-z]+(?:[-'’][A-Za-z]+)*(?!\w)")
_LEXICON_PATH = Path(__file__).resolve().parents[2] / "data" / "orthography" / "spelling-v1.json"


def _unique_entries(pairs: list[tuple[str, str]]) -> dict[str, str]:
    entries = {}
    for source, target in pairs:
        if source in entries:
            raise ValueError(f"Duplicate English spelling entry: {source}")
        entries[source] = target
    return entries


def _load_spelling_lexicon() -> dict[str, str]:
    lexicon = json.loads(_LEXICON_PATH.read_text(encoding="utf-8"), object_pairs_hook=_unique_entries)
    if not isinstance(lexicon, dict) or not lexicon or any(
        not isinstance(source, str)
        or source != source.lower()
        or _WORD.fullmatch(source) is None
        or not isinstance(target, str)
        or not target
        or target != target.lower()
        or _WORD.fullmatch(target) is None
        or source == target
        for source, target in lexicon.items()
    ):
        raise ValueError("English spelling lexicon must map distinct lowercase forms to single lowercase words")
    return lexicon


_TYPOS = _load_spelling_lexicon()
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
            corrected = _case(original, replacement)
            if not text[:word.start()].strip() and original.islower():
                corrected = corrected.capitalize()
            edits.append(Edit(word.start(), word.end(), original, corrected, IssueCode.SPELLING))
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
