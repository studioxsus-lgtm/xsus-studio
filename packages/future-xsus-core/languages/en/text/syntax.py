"""Analyze simple English statements, negatives and auxiliary-led questions."""

import re
from collections import defaultdict
from dataclasses import dataclass
from enum import StrEnum

from .morphology import VerbForm, inflect_verb, pluralize_noun

_TOKEN = r"[A-Za-z]+(?:[-'][A-Za-z]+)*"
_CLAUSE = re.compile(rf"{_TOKEN}(?:[ \t]+{_TOKEN})*[.!?]?")
_DETERMINERS = frozenset({"a", "an", "the", "my", "your", "his", "her", "its", "our", "their", "this", "that", "these", "those"})
_ADJECTIVES = frozenset({"clear", "early", "final", "good", "happy", "late", "new", "old", "ready", "revised", "short", "small", "young"})
_NOUNS = frozenset({
    "agenda", "answer", "badge", "budget", "calendar", "child", "class", "colleague", "copy",
    "deer", "dog", "draft", "engine", "file", "folder", "form", "friend", "invoice", "label",
    "link", "man", "meeting", "message", "model", "mouse", "note", "person", "plan",
    "proposal", "receipt", "report", "request", "sheep", "slide", "student", "summary",
    "teacher", "ticket", "time", "woman",
})
_VERBS = frozenset({
    "answer", "ask", "be", "begin", "break", "bring", "build", "buy", "call", "check",
    "choose", "come", "do", "drink", "drive", "drop", "eat", "explain", "fall", "feel",
    "finish", "find", "fly", "forget", "give", "go", "grow", "have", "help", "keep",
    "know", "leave", "like", "lose", "make", "meet", "need", "open", "pay", "play",
    "plan", "read", "receive", "return", "rise", "run", "say", "see", "sell", "send",
    "share", "sleep", "speak", "stand", "start", "stop", "study", "take", "teach",
    "tell", "thank", "visit", "walk", "wear", "win", "work", "write",
})
_AUXILIARIES = {
    "do": "do", "does": "do", "did": "do",
    "have": "have", "has": "have", "had": "have",
    "am": "be", "is": "be", "are": "be", "was": "be", "were": "be",
}
_NEGATIVE_CONTRACTIONS = {f"{form}n't": form for form in _AUXILIARIES if form != "am"}


class Number(StrEnum):
    SINGULAR = "singular"
    PLURAL = "plural"


class ClauseKind(StrEnum):
    DECLARATIVE = "declarative"
    QUESTION = "question"


@dataclass(frozen=True, slots=True)
class Phrase:
    text: str
    head: str
    person: int
    number: Number | None


@dataclass(frozen=True, slots=True)
class Auxiliary:
    text: str
    lemma: str
    forms: frozenset[VerbForm]


@dataclass(frozen=True, slots=True)
class Clause:
    subject: Phrase
    verb: str
    lemma: str
    forms: frozenset[VerbForm]
    object: Phrase | None
    complement: str | None
    kind: ClauseKind = ClauseKind.DECLARATIVE
    negated: bool = False
    auxiliary: Auxiliary | None = None


_PRONOUNS = {
    "i": (1, Number.SINGULAR), "me": (1, Number.SINGULAR),
    "you": (2, None),
    "he": (3, Number.SINGULAR), "him": (3, Number.SINGULAR),
    "she": (3, Number.SINGULAR), "her": (3, Number.SINGULAR),
    "it": (3, Number.SINGULAR),
    "we": (1, Number.PLURAL), "us": (1, Number.PLURAL),
    "they": (3, Number.PLURAL), "them": (3, Number.PLURAL),
}
_NOUN_NUMBERS: dict[str, set[Number]] = defaultdict(set)
for _noun in _NOUNS:
    _NOUN_NUMBERS[_noun].add(Number.SINGULAR)
    _NOUN_NUMBERS[pluralize_noun(_noun)].add(Number.PLURAL)

_VERB_FORMS: dict[str, dict[str, set[VerbForm]]] = defaultdict(lambda: defaultdict(set))
for _lemma in _VERBS:
    for _form, _feature in inflect_verb(_lemma).forms():
        _VERB_FORMS[_form][_lemma].add(_feature)


def _noun_phrase(tokens: list[str]) -> Phrase | None:
    if not tokens:
        return None
    words = [token.lower() for token in tokens]
    if len(words) == 1 and words[0] in _PRONOUNS:
        person, number = _PRONOUNS[words[0]]
        return Phrase(tokens[0], words[0], person, number)
    determiner = words[0] if words[0] in _DETERMINERS else None
    if determiner and len(words) == 1:
        return None
    modifiers = words[1:-1] if determiner else words[:-1]
    head = words[-1]
    numbers = _NOUN_NUMBERS.get(head)
    if numbers and all(modifier in _ADJECTIVES for modifier in modifiers):
        if len(numbers) == 1:
            number = next(iter(numbers))
        elif determiner in {"a", "an", "this", "that"}:
            number = Number.SINGULAR
        elif determiner in {"these", "those"}:
            number = Number.PLURAL
        else:
            number = None
        return Phrase(" ".join(tokens), head, 3, number)
    if not determiner and len(tokens) <= 2 and all(
        token[0].isupper()
        and token.lower() not in _VERB_FORMS
        and token.lower() not in _PRONOUNS
        and token.lower() not in _ADJECTIVES
        for token in tokens
    ):
        return Phrase(" ".join(tokens), head, 3, Number.SINGULAR)
    return None


def _auxiliary(word: str) -> Auxiliary | None:
    lemma = _AUXILIARIES.get(word.lower())
    if lemma is None:
        return None
    return Auxiliary(word, lemma, frozenset(_VERB_FORMS[word.lower()][lemma]))


def _predicate(
    subject: Phrase, verb: str, rest: list[str], kind: ClauseKind, negated: bool,
    auxiliary: Auxiliary | None = None,
) -> list[Clause]:
    nominal = _noun_phrase(rest)
    analyses = []
    for lemma, forms in _VERB_FORMS.get(verb.lower(), {}).items():
        if lemma == "be":
            complement = nominal.text if nominal else None
            if len(rest) == 1 and rest[0].lower() in _ADJECTIVES:
                complement = rest[0]
            if complement is not None:
                analyses.append(Clause(subject, verb, lemma, frozenset(forms), None, complement, kind, negated, auxiliary))
        elif not rest or nominal is not None:
            # A bare past participle after be may belong to the passive voice.
            if auxiliary and auxiliary.lemma == "be" and not rest and VerbForm.PAST_PARTICIPLE in forms:
                continue
            analyses.append(Clause(subject, verb, lemma, frozenset(forms), nominal, None, kind, negated, auxiliary))
    return analyses


def _negation(tokens: list[str]) -> tuple[bool, list[str]]:
    if tokens and tokens[0].lower() == "not":
        return True, tokens[1:]
    return False, tokens


def _question(tokens: list[str], *, contracted_start: bool) -> list[Clause]:
    auxiliary = _auxiliary(tokens[0])
    if auxiliary is None:
        return []
    contracted, remainder = _negation(tokens[1:])
    if contracted and not contracted_start:
        return []
    analyses = []
    for index in range(1, len(remainder)):
        subject = _noun_phrase(remainder[:index])
        if subject is None:
            continue
        negative, predicate = _negation(remainder[index:])
        if not predicate or (contracted and negative):
            continue
        negated = contracted or negative
        analyses.extend(_predicate(subject, predicate[0], predicate[1:], ClauseKind.QUESTION, negated, auxiliary))
        if auxiliary.lemma == "be":
            analyses.extend(_predicate(subject, auxiliary.text, predicate, ClauseKind.QUESTION, negated))
    return analyses


def _statement(tokens: list[str]) -> list[Clause]:
    analyses = []
    for index in range(1, len(tokens)):
        verb = tokens[index]
        if verb.lower() not in _VERB_FORMS:
            continue
        subject = _noun_phrase(tokens[:index])
        if subject is None:
            continue
        negated, predicate = _negation(tokens[index + 1:])
        auxiliary = _auxiliary(verb)
        if auxiliary and predicate:
            analyses.extend(_predicate(subject, predicate[0], predicate[1:], ClauseKind.DECLARATIVE, negated, auxiliary))
        if not negated or (auxiliary and auxiliary.lemma == "be"):
            analyses.extend(_predicate(subject, verb, predicate, ClauseKind.DECLARATIVE, negated))
    return analyses


def analyze_clause(sentence: str) -> Clause | None:
    """Return roles when the tokens admit exactly one supported interpretation."""
    text = sentence.strip().replace("’", "'")
    if not _CLAUSE.fullmatch(text):
        return None
    words = text.rstrip(".!?").split()
    tokens = []
    for word in words:
        expanded = _NEGATIVE_CONTRACTIONS.get(word.lower())
        if expanded is None:
            tokens.append(word)
        else:
            tokens.extend((expanded.capitalize() if word[0].isupper() else expanded, "not"))
    if text.endswith("?"):
        analyses = _question(tokens, contracted_start=words[0].lower() in _NEGATIVE_CONTRACTIONS)
    else:
        analyses = _statement(tokens)
    return analyses[0] if len(analyses) == 1 else None
