"""Opt-in controlled-English structured clauses with modifiers and tense.

The grammar is deliberately bounded: explicit SVO, optional adjective,
optional manner adverb, present simple or regular past. No open-domain
syntax, inference, or implicit coreference.
"""
from dataclasses import dataclass
import re

from .expanded_english_v1 import SUBJECTS, VERBS, NOUNS, _SINGULAR, _VERB_FORMS

ADJECTIVES = (
    "new", "old", "large", "small", "complex", "simple", "secure", "public",
    "private", "digital", "technical", "important", "detailed", "complete",
    "updated", "original", "final", "temporary", "reliable", "accurate",
    "efficient", "modern", "local", "global",
)
ADVERBS = (
    "quickly", "slowly", "carefully", "correctly", "clearly", "securely",
    "reliably", "efficiently", "automatically", "manually", "regularly",
    "successfully", "precisely", "consistently", "thoroughly", "safely",
)
_PAST_FORMS = {
    verb + "d" if verb.endswith("e") else
    verb[:-1] + "ied" if verb.endswith("y") and verb[-2] not in "aeiou"
    else verb + "ed": verb for verb in VERBS
}
_VALID = re.compile(r"^[a-z]+(?: [a-z]+)*[.!]?$")


@dataclass(frozen=True, slots=True)
class StructuredClause:
    status: str
    subject: str | None
    action: str | None
    object: str | None
    adjective: str | None
    adverb: str | None
    tense: str | None
    reasons: tuple[str, ...]


def _abstain(reason: str) -> StructuredClause:
    return StructuredClause("abstained", None, None, None, None, None, None, (reason,))


def analyze_structured_clause(text: str) -> StructuredClause:
    if not isinstance(text, str) or not text.strip() or len(text) > 1000:
        raise ValueError("text must contain 1 to 1000 characters")
    normalized = text.strip().casefold()
    if not _VALID.fullmatch(normalized):
        return _abstain("unsupported_characters_or_structure")
    if normalized.endswith((".", "!")):
        normalized = normalized[:-1]
    tokens = normalized.split()
    if len(tokens) > 12 or any(t in {"and", "or", "but", "because", "if", "not", "never"}
                                  for t in tokens):
        return _abstain("unsupported_complex_or_negative_clause")
    subject = next((s for s in sorted(SUBJECTS, key=len, reverse=True)
                    if tokens[:len(s.split())] == s.split()), None)
    if subject is None:
        return _abstain("unsupported_subject")
    remaining = tokens[len(subject.split()):]
    if not remaining:
        return _abstain("missing_verb")
    verb_form = remaining.pop(0)
    if verb_form in _PAST_FORMS:
        action, tense = _PAST_FORMS[verb_form], "past_simple"
    elif verb_form in _VERB_FORMS:
        action, tense = _VERB_FORMS[verb_form], "present_simple"
        if (verb_form != action) != (subject in _SINGULAR):
            return _abstain("invalid_present_agreement")
    else:
        return _abstain("unsupported_verb_form")
    adverb = None
    if remaining and remaining[0] in ADVERBS:
        adverb = remaining.pop(0)
    if not remaining or remaining.pop(0) not in {"the", "a"}:
        return _abstain("missing_determiner")
    object_tokens = remaining
    adjective = None
    if object_tokens and object_tokens[0] in ADJECTIVES:
        adjective = object_tokens.pop(0)
    if len(object_tokens) != 1 or object_tokens[0] not in NOUNS:
        return _abstain("unsupported_object")
    return StructuredClause("resolved", subject, action, object_tokens[0],
                            adjective, adverb, tense, ())


def structured_clause_dict(text: str) -> dict:
    frame = analyze_structured_clause(text)
    return {
        "contract": "future-xsus-core.expanded-structures.v1",
        "status": frame.status, "subject": frame.subject,
        "action": frame.action, "object": frame.object,
        "adjective": frame.adjective, "adverb": frame.adverb,
        "tense": frame.tense, "reasons": frame.reasons,
        "open_domain_understanding_proven": False,
        "production_authorized": False,
    }
