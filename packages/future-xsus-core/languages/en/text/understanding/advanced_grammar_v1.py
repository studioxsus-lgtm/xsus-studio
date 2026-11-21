"""Opt-in advanced controlled-English grammar: WH, progressive, perfect, passive.

This recognizes deliberately bounded patterns, not general English.
"""
from dataclasses import dataclass
import re
from .expanded_english_v1 import SUBJECTS, VERBS, NOUNS, _SINGULAR, _VERB_FORMS
from .expanded_structures_v1 import _PAST_FORMS

_WORDS = re.compile(r"^[a-z]+(?: [a-z]+)*[.?!]?$")
_WH = frozenset({"what", "which", "why", "when", "where", "how"})
_BE = {"am": "present", "is": "present", "are": "present",
       "was": "past", "were": "past"}
_HAVE = {"have": "present", "has": "present", "had": "past"}
_PARTICIPLES = {
    (verb + "d" if verb.endswith("e") else
     verb[:-1] + "ied" if verb.endswith("y") and verb[-2] not in "aeiou"
     else verb + "ed"): verb for verb in VERBS
}
_ING = {
    (verb[:-1] + "ing" if verb.endswith("e") else verb + "ing"): verb
    for verb in VERBS
}
_ING.update({"running": "run", "writing": "write", "creating": "create"})
_PARTICIPLES.update({"written": "write", "read": "read", "built": "build",
                     "sent": "send"})


@dataclass(frozen=True, slots=True)
class AdvancedGrammarFrame:
    status: str
    kind: str | None
    tense: str | None
    subject: str | None
    action: str | None
    object: str | None
    reasons: tuple[str, ...]


def _abstain(reason: str) -> AdvancedGrammarFrame:
    return AdvancedGrammarFrame("abstained", None, None, None, None, None, (reason,))


def _subject(tokens):
    return next((s for s in sorted(SUBJECTS, key=len, reverse=True)
                 if tokens[:len(s.split())] == s.split()), None)


def _object(tokens):
    if len(tokens) == 2 and tokens[0] in {"the", "a"} and tokens[1] in NOUNS:
        return " ".join(tokens)
    return None


def _be_agrees(aux, subject):
    if aux == "am":
        return subject == "i"
    if aux in {"is", "was"}:
        return subject in _SINGULAR or aux == "was" and subject == "i"
    return subject not in _SINGULAR and not (subject == "i" and aux == "are")


def _have_agrees(aux, subject):
    return aux == "had" or (aux == "has") == (subject in _SINGULAR)


def analyze_advanced_grammar(text: str) -> AdvancedGrammarFrame:
    if not isinstance(text, str) or not text.strip() or len(text) > 1000:
        raise ValueError("text must contain 1 to 1000 characters")
    normalized = text.strip().casefold()
    if not _WORDS.fullmatch(normalized):
        return _abstain("unsupported_characters")
    punctuation = normalized[-1] if normalized[-1] in ".?!" else ""
    tokens = normalized[:-1].split() if punctuation else normalized.split()
    if len(tokens) > 20:
        return _abstain("unsupported_length")
    if any(t in {"and", "or", "but", "because", "although", "if", "who", "that"}
           for t in tokens):
        return _abstain("unsupported_complex_clause")
    if punctuation == "?" and tokens and tokens[0] in _WH:
        wh = tokens.pop(0)
        if len(tokens) < 4 or tokens[0] not in {"do", "does", "did"}:
            return _abstain("unsupported_wh_form")
        aux = tokens.pop(0)
        subject = _subject(tokens)
        if subject is None:
            return _abstain("unsupported_subject")
        tokens = tokens[len(subject.split()):]
        if aux == "does" and subject not in _SINGULAR or aux == "do" and subject in _SINGULAR:
            return _abstain("invalid_auxiliary_agreement")
        if not tokens or tokens[0] not in VERBS:
            return _abstain("unsupported_action")
        action = tokens.pop(0)
        obj = _object(tokens)
        if obj is None:
            return _abstain("unsupported_object")
        return AdvancedGrammarFrame("resolved", "wh_question_" + wh,
                                    "past_simple" if aux == "did" else "present_simple",
                                    subject, action, obj, ())
    subject = _subject(tokens)
    if subject is None and len(tokens) >= 2 and tokens[0] == "the" and tokens[1] in NOUNS:
        subject = " ".join(tokens[:2])
    if subject is None:
        return _abstain("unsupported_subject")
    tokens = tokens[len(subject.split()):]
    if len(tokens) < 3:
        return _abstain("unsupported_structure")
    aux = tokens.pop(0)
    if aux in _BE and _be_agrees(aux, subject):
        verb_form = tokens.pop(0)
        if verb_form in _ING:
            action = _ING[verb_form]
            obj = _object(tokens)
            if obj is not None:
                return AdvancedGrammarFrame("resolved", "progressive",
                    "present_progressive" if _BE[aux] == "present" else "past_progressive",
                    subject, action, obj, ())
        elif verb_form in _PARTICIPLES:
            action = _PARTICIPLES[verb_form]
            if len(tokens) == 3 and tokens[0] == "by" and tokens[1] == "the" and tokens[2] in NOUNS:
                return AdvancedGrammarFrame("resolved", "passive",
                    "present_passive" if _BE[aux] == "present" else "past_passive",
                    subject, action, " ".join(tokens[1:]), ())
    if aux in _HAVE and _have_agrees(aux, subject):
        verb_form = tokens.pop(0)
        if verb_form in _PARTICIPLES:
            obj = _object(tokens)
            if obj is not None:
                return AdvancedGrammarFrame("resolved", "perfect",
                    "present_perfect" if _HAVE[aux] == "present" else "past_perfect",
                    subject, _PARTICIPLES[verb_form], obj, ())
    return _abstain("unsupported_advanced_grammar")


def advanced_grammar_dict(text: str) -> dict:
    frame = analyze_advanced_grammar(text)
    return {
        "contract": "future-xsus-core.advanced-grammar.v1",
        "status": frame.status, "kind": frame.kind, "tense": frame.tense,
        "subject": frame.subject, "action": frame.action,
        "object": frame.object, "reasons": frame.reasons,
        "complete_english_grammar_proven": False,
        "production_authorized": False,
    }
