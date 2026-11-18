"""Analyze simple English statements, negatives and auxiliary-led questions."""

import re
from collections import defaultdict
from dataclasses import dataclass, replace
from enum import StrEnum

from .morphology import VerbForm, inflect_verb, pluralize_noun

_TOKEN = r"[A-Za-z]+(?:[-'][A-Za-z]+)*"
_CLAUSE = re.compile(rf"{_TOKEN}(?:[ \t]+{_TOKEN})*[.!?]?")
_DETERMINERS = frozenset({"a", "an", "the", "my", "your", "his", "her", "its", "our", "their", "this", "that", "these", "those"})
_ADJECTIVES = frozenset({"clear", "early", "final", "good", "happy", "late", "new", "old", "ready", "revised", "short", "small", "young", "honest", "european"})
_NOUNS = frozenset({
    "agenda", "answer", "badge", "budget", "calendar", "child", "class", "colleague", "copy",
    "deer", "dog", "draft", "engine", "file", "folder", "form", "friend", "invoice", "label",
    "link", "man", "meeting", "message", "model", "mouse", "note", "person", "plan",
    "proposal", "receipt", "report", "request", "sheep", "slide", "student", "summary",
    "teacher", "ticket", "time", "woman", "heir", "honor", "hour", "uniform", "unit", "university", "user",
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
_MODALS = frozenset({"can", "could", "may", "might", "must", "shall", "should", "will", "would"})
_WH_SUBJECTS = frozenset({"who", "what"})
_WH_OBJECTS = _WH_SUBJECTS | {"whom"}
# Existing lexical senses that license a direct object.
_TRANSITIVE_VERBS = frozenset({
    "answer", "ask", "break", "bring", "build", "buy", "call", "check", "choose",
    "do", "drink", "drive", "drop", "eat", "explain", "find", "finish", "forget",
    "give", "have", "help", "keep", "know", "leave", "like", "lose", "make", "meet",
    "need", "open", "pay", "plan", "read", "receive", "return", "say", "see", "sell",
    "send", "share", "study", "take", "teach", "tell", "thank", "visit", "wear",
    "win", "write",
})
_AGENT_NOUNS = frozenset({
    "child", "colleague", "deer", "dog", "engine", "friend", "man", "model",
    "mouse", "person", "sheep", "student", "teacher", "woman",
})
_TEMPORAL_NAMES = frozenset({
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december", "noon", "midnight",
    "today", "tomorrow", "yesterday",
})
_NEGATIVE_CONTRACTIONS = {f"{form}n't": form for form in _AUXILIARIES if form != "am"}
_NEGATIVE_CONTRACTIONS.update({
    "can't": "can", "couldn't": "could", "mightn't": "might", "mustn't": "must",
    "shan't": "shall", "shouldn't": "should", "won't": "will", "wouldn't": "would",
})


class Number(StrEnum):
    SINGULAR = "singular"
    PLURAL = "plural"


class ClauseKind(StrEnum):
    DECLARATIVE = "declarative"
    QUESTION = "question"


class Voice(StrEnum):
    ACTIVE = "active"
    PASSIVE = "passive"


class InterrogativeRole(StrEnum):
    SUBJECT = "subject"
    OBJECT = "object"
    LOCATION = "location"
    TIME = "time"
    MANNER = "manner"
    REASON = "reason"


_WH_ADVERBS = {
    "where": InterrogativeRole.LOCATION,
    "when": InterrogativeRole.TIME,
    "how": InterrogativeRole.MANNER,
    "why": InterrogativeRole.REASON,
}


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
    interrogative_role: InterrogativeRole | None = None
    voice: Voice = Voice.ACTIVE
    agent: Phrase | None = None


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
_AGENT_FORMS = _AGENT_NOUNS | {pluralize_noun(noun) for noun in _AGENT_NOUNS}

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


def _by_agent(tokens: list[str]) -> Phrase | None:
    if not tokens or tokens[0].lower() != "by":
        return None
    agent = _noun_phrase(tokens[1:])
    if agent is None:
        return None
    if agent.head in _AGENT_FORMS or agent.head in _PRONOUNS:
        return agent
    if agent.head not in _NOUN_NUMBERS and not any(token.lower() in _TEMPORAL_NAMES for token in tokens[1:]):
        return agent
    return None


def _auxiliary(word: str) -> Auxiliary | None:
    normalized = word.lower()
    if normalized in _MODALS:
        return Auxiliary(word, normalized, frozenset({VerbForm.MODAL}))
    lemma = _AUXILIARIES.get(normalized)
    if lemma is None:
        return None
    return Auxiliary(word, lemma, frozenset(_VERB_FORMS[normalized][lemma]))


def _predicate(
    subject: Phrase, verb: str, rest: list[str], kind: ClauseKind, negated: bool,
    auxiliary: Auxiliary | None = None,
) -> list[Clause]:
    nominal = _noun_phrase(rest)
    after_be = auxiliary is not None and auxiliary.lemma == "be"
    agent = _by_agent(rest) if after_be else None
    analyses = []
    for lemma, forms in _VERB_FORMS.get(verb.lower(), {}).items():
        if lemma == "be":
            complement = nominal.text if nominal else None
            if len(rest) == 1 and rest[0].lower() in _ADJECTIVES:
                complement = rest[0]
            if complement is not None:
                analyses.append(Clause(subject, verb, lemma, frozenset(forms), None, complement, kind, negated, auxiliary))
        elif after_be and VerbForm.PAST_PARTICIPLE in forms and (agent is not None or not rest):
            # Prefer the existing copular analysis for a known bare adjective.
            if lemma in _TRANSITIVE_VERBS and (agent is not None or verb.lower() not in _ADJECTIVES):
                analyses.append(Clause(
                    subject, verb, lemma, frozenset(forms), None, None, kind, negated,
                    auxiliary, voice=Voice.PASSIVE, agent=agent,
                ))
        elif not rest or nominal is not None:
            analyses.append(Clause(subject, verb, lemma, frozenset(forms), nominal, None, kind, negated, auxiliary))
    return analyses


def _negation(tokens: list[str]) -> tuple[bool, list[str]]:
    if tokens and tokens[0].lower() == "not":
        return True, tokens[1:]
    return False, tokens


def _question(
    tokens: list[str], *, contracted_start: bool, wh_complement: str | None = None,
) -> list[Clause]:
    auxiliary = _auxiliary(tokens[0])
    if auxiliary is None:
        return []
    contracted, remainder = _negation(tokens[1:])
    if contracted and not contracted_start:
        return []
    analyses = []
    # A fronted place or time can supply the complement of a bare copula.
    bare_copula = wh_complement is not None and auxiliary.lemma == "be"
    subject_boundaries = range(1, len(remainder) + 1) if bare_copula else range(1, len(remainder))
    for index in subject_boundaries:
        subject = _noun_phrase(remainder[:index])
        if subject is None:
            continue
        negative, predicate = _negation(remainder[index:])
        if contracted and negative:
            continue
        negated = contracted or negative
        if not predicate:
            if bare_copula:
                analyses.append(Clause(
                    subject, auxiliary.text, auxiliary.lemma, auxiliary.forms,
                    None, wh_complement, ClauseKind.QUESTION, negated,
                ))
            continue
        analyses.extend(_predicate(subject, predicate[0], predicate[1:], ClauseKind.QUESTION, negated, auxiliary))
        if auxiliary.lemma == "be":
            analyses.extend(_predicate(subject, auxiliary.text, predicate, ClauseKind.QUESTION, negated))
    return analyses


def _statement(tokens: list[str], *, wh_subject: Phrase | None = None) -> list[Clause]:
    analyses = []
    subject_boundaries = (1,) if wh_subject else range(1, len(tokens))
    for index in subject_boundaries:
        verb = tokens[index]
        auxiliary = _auxiliary(verb)
        if auxiliary is None and verb.lower() not in _VERB_FORMS:
            continue
        subject = wh_subject or _noun_phrase(tokens[:index])
        if subject is None:
            continue
        negated, predicate = _negation(tokens[index + 1:])
        if auxiliary and predicate:
            analyses.extend(_predicate(subject, predicate[0], predicate[1:], ClauseKind.DECLARATIVE, negated, auxiliary))
        if not negated or (auxiliary and auxiliary.lemma == "be"):
            analyses.extend(_predicate(subject, verb, predicate, ClauseKind.DECLARATIVE, negated))
    return analyses


def _wh_question(tokens: list[str], *, contracted_auxiliary: bool) -> list[Clause]:
    if len(tokens) < 2:
        return []
    interrogative = tokens[0].lower()
    if (role := _WH_ADVERBS.get(interrogative)) is not None:
        complement = tokens[0] if role in {InterrogativeRole.LOCATION, InterrogativeRole.TIME} else None
        return [
            replace(clause, interrogative_role=role)
            for clause in _question(tokens[1:], contracted_start=contracted_auxiliary, wh_complement=complement)
        ]

    phrase = Phrase(tokens[0], interrogative, 3, None)
    analyses = []
    if interrogative in _WH_SUBJECTS:
        analyses.extend(
            replace(clause, kind=ClauseKind.QUESTION, interrogative_role=InterrogativeRole.SUBJECT)
            for clause in _statement(tokens, wh_subject=phrase)
            if clause.lemma != "be"
        )
    analyses.extend(
        replace(clause, object=phrase, interrogative_role=InterrogativeRole.OBJECT)
        for clause in _question(tokens[1:], contracted_start=contracted_auxiliary)
        if clause.voice is Voice.ACTIVE and clause.object is None and clause.lemma in _TRANSITIVE_VERBS
    )
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
        if word.lower() == "cannot":
            expanded = "can"
        if expanded is None:
            tokens.append(word)
        else:
            tokens.extend((expanded.capitalize() if word[0].isupper() else expanded, "not"))
    initial = words[0].lower()
    if text.endswith("?") and (initial in _WH_OBJECTS or initial in _WH_ADVERBS):
        contracted_auxiliary = len(words) > 1 and words[1].lower() in _NEGATIVE_CONTRACTIONS
        analyses = _wh_question(tokens, contracted_auxiliary=contracted_auxiliary)
    elif text.endswith("?"):
        analyses = _question(tokens, contracted_start=words[0].lower() in _NEGATIVE_CONTRACTIONS)
    else:
        analyses = _statement(tokens)
    return analyses[0] if len(analyses) == 1 else None
