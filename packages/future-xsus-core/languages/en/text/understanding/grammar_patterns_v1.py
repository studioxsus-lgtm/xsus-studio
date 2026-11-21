"""Opt-in deterministic controlled-English grammar pattern recognizer.

Supports finite, explicitly constrained SVO clause patterns. It does not
claim complete English grammar, full semantic understanding or production.
"""
from dataclasses import dataclass
import re

from .expanded_english_v1 import SUBJECTS, VERBS, NOUNS, _SINGULAR, _VERB_FORMS
from .expanded_structures_v1 import ADJECTIVES, ADVERBS, _PAST_FORMS

_WORDS = re.compile(r"^[a-z]+(?:'[a-z]+)?(?: [a-z]+(?:'[a-z]+)?)*[.?!]?$")
_MODAL = frozenset({"can", "will", "should", "must", "may", "might", "could", "would"})
_LINKERS = frozenset({"and", "but"})
_INFINITIVE = frozenset({"to"})
_FORMS = {**_VERB_FORMS, **_PAST_FORMS}
_SINGULAR_PRESENT = {lemma: form for form, lemma in _VERB_FORMS.items() if lemma != form}


@dataclass(frozen=True, slots=True)
class GrammarPattern:
    status: str
    kind: str | None
    tense: str | None
    polarity: str | None
    subject: str | None
    action: str | None
    object: str | None
    modal: str | None
    subordinate: bool
    reasons: tuple[str, ...]


def _abstain(reason: str) -> GrammarPattern:
    return GrammarPattern("abstained", None, None, None, None, None, None, None,
                          False, (reason,))


def _subject(tokens: list[str]):
    return next((s for s in sorted(SUBJECTS, key=len, reverse=True)
                 if tokens[:len(s.split())] == s.split()), None)


def _parse_object(tokens: list[str]):
    if not tokens or tokens[0] not in {"the", "a"}:
        return None
    remaining = tokens[1:]
    if remaining and remaining[0] in ADJECTIVES:
        remaining = remaining[1:]
    if len(remaining) != 1 or remaining[0] not in NOUNS:
        return None
    return " ".join(tokens)


def _parse_declarative(tokens: list[str]):
    subject = _subject(tokens)
    if subject is None:
        return None
    rest = tokens[len(subject.split()):]
    if not rest:
        return None
    polarity = "positive"
    modal = None
    tense = None
    if rest[0] in _MODAL:
        modal = rest.pop(0)
        tense = "modal"
        if rest and rest[0] == "not":
            polarity = "negative"
            rest.pop(0)
    elif rest[0] in {"do", "does", "did"} and len(rest) > 1 and rest[1] == "not":
        aux = rest.pop(0)
        rest.pop(0)
        if aux == "does" and subject not in _SINGULAR:
            return None
        if aux == "do" and subject in _SINGULAR:
            return None
        tense = "past_simple" if aux == "did" else "present_simple"
        polarity = "negative"
    if not rest:
        return None
    verb_form = rest.pop(0)
    if modal or polarity == "negative":
        if verb_form not in VERBS:
            return None
        action = verb_form
    elif verb_form in _PAST_FORMS:
        action = _PAST_FORMS[verb_form]
        tense = "past_simple"
    elif verb_form in _VERB_FORMS:
        action = _VERB_FORMS[verb_form]
        if (verb_form != action) != (subject in _SINGULAR):
            return None
        tense = "present_simple"
    else:
        return None
    if rest and rest[0] in ADVERBS:
        rest.pop(0)
    obj = _parse_object(rest)
    if obj is None:
        return None
    return GrammarPattern("resolved", "declarative", tense, polarity,
                          subject, action, obj, modal, False, ())


def _parse_question(tokens: list[str]):
    if len(tokens) < 4 or tokens[0] not in {"do", "does", "did", "can", "will", "should"}:
        return None
    aux = tokens.pop(0)
    subject = _subject(tokens)
    if subject is None:
        return None
    rest = tokens[len(subject.split()):]
    if not rest:
        return None
    polarity = "positive"
    if rest[0] == "not":
        polarity = "negative"
        rest = rest[1:]
    if not rest or rest[0] not in VERBS:
        return None
    action = rest.pop(0)
    obj = _parse_object(rest)
    if obj is None:
        return None
    if aux == "does" and subject not in _SINGULAR:
        return None
    if aux == "do" and subject in _SINGULAR:
        return None
    tense = "past_simple" if aux == "did" else "present_simple" if aux in {"do", "does"} else "modal"
    return GrammarPattern("resolved", "yes_no_question", tense, polarity,
                          subject, action, obj, aux if tense == "modal" else None,
                          False, ())


def analyze_grammar_pattern(text: str) -> GrammarPattern:
    if not isinstance(text, str) or not text.strip() or len(text) > 1000:
        raise ValueError("text must contain 1 to 1000 characters")
    normalized = text.strip().casefold()
    if not _WORDS.fullmatch(normalized):
        return _abstain("unsupported_characters")
    punctuation = normalized[-1] if normalized[-1] in ".?!" else ""
    tokens = normalized[:-1].split() if punctuation else normalized.split()
    if len(tokens) > 24:
        return _abstain("unsupported_length")
    if any(token in {"because", "although", "if", "while", "who", "which", "that"}
           for token in tokens):
        return _abstain("unsupported_subordination")
    if any(token in _LINKERS for token in tokens):
        return _abstain("unsupported_coordination")
    if punctuation == "?":
        result = _parse_question(tokens[:])
    else:
        result = _parse_declarative(tokens[:])
    return result if result is not None else _abstain("unsupported_grammar_pattern")


def grammar_pattern_dict(text: str) -> dict:
    frame = analyze_grammar_pattern(text)
    return {
        "contract": "future-xsus-core.grammar-patterns.v1",
        "status": frame.status, "kind": frame.kind, "tense": frame.tense,
        "polarity": frame.polarity, "subject": frame.subject,
        "action": frame.action, "object": frame.object,
        "modal": frame.modal, "subordinate": frame.subordinate,
        "reasons": frame.reasons, "production_authorized": False,
        "complete_english_grammar_proven": False,
    }
