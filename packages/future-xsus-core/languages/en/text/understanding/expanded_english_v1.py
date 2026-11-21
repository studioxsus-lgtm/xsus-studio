"""Opt-in expanded controlled-English SVO grammar, separate from Phase 2.

40 explicit verb lemmas, 50 explicit noun heads, 15 explicit subjects.
This is deterministic grammar coverage, not general natural-language understanding.
"""
from dataclasses import dataclass
import re

SUBJECTS = (
    "i", "you", "he", "she", "we", "they", "the user", "the teacher",
    "the student", "the developer", "the engineer", "the researcher",
    "the analyst", "the manager", "the system",
)
VERBS = (
    "read", "write", "build", "check", "open", "send", "review", "create",
    "update", "delete", "test", "design", "develop", "inspect", "validate",
    "verify", "document", "organize", "prepare", "analyze", "compare",
    "measure", "monitor", "manage", "plan", "publish", "archive", "store",
    "retrieve", "process", "generate", "transform", "evaluate", "classify",
    "summarize", "translate", "calculate", "schedule", "repair", "deploy",
)
NOUNS = (
    "report", "file", "project", "code", "message", "document", "application",
    "test", "model", "plan", "dataset", "record", "request", "response",
    "result", "summary", "translation", "analysis", "design", "feature",
    "module", "component", "service", "system", "engine", "workflow",
    "pipeline", "configuration", "setting", "contract", "interface",
    "function", "variable", "database", "table", "query", "index",
    "schema", "backup", "log", "metric", "benchmark", "experiment",
    "sample", "example", "article", "chapter", "lesson", "task", "ticket",
)
_DETERMINERS = ("the", "a")
_AUX = {"do": "plural", "does": "singular", "did": "either"}
_CONTRACTIONS = {"don't": "do", "doesn't": "does", "didn't": "did"}
_WORD = re.compile(r"^[a-z]+(?:'[a-z]+)?(?: [a-z]+(?:'[a-z]+)?)*[.!]?$")
_VERB_FORMS = {verb: verb for verb in VERBS}
_VERB_FORMS.update({(verb[:-1] + "ies" if verb.endswith("y") and verb[-2] not in "aeiou"
                     else verb + "es" if verb.endswith(("s", "x", "z", "ch", "sh"))
                     else verb + "s"): verb for verb in VERBS})
_SINGULAR = frozenset({"he", "she", "the user", "the teacher", "the student",
                        "the developer", "the engineer", "the researcher",
                        "the analyst", "the manager", "the system"})


@dataclass(frozen=True, slots=True)
class ExpandedFrame:
    status: str
    subject: str | None
    action: str | None
    object: str | None
    polarity: str | None
    reasons: tuple[str, ...]


def _abstain(reason: str) -> ExpandedFrame:
    return ExpandedFrame("abstained", None, None, None, None, (reason,))


def analyze_expanded_english(text: str) -> ExpandedFrame:
    if not isinstance(text, str) or not text.strip() or len(text) > 1000:
        raise ValueError("text must contain 1 to 1000 characters")
    normalized = text.strip().casefold()
    if not _WORD.fullmatch(normalized):
        return _abstain("unsupported_characters_or_structure")
    if normalized.endswith(("!", ".")):
        normalized = normalized[:-1]
    tokens = normalized.split()
    if len(tokens) > 12:
        return _abstain("unsupported_length")
    if any(token in {"and", "or", "but", "because", "if", "who", "which", "that"}
           for token in tokens):
        return _abstain("complex_clause")
    subject = next((s for s in sorted(SUBJECTS, key=len, reverse=True)
                    if tokens[:len(s.split())] == s.split()), None)
    if subject is None:
        return _abstain("unsupported_subject")
    remaining = tokens[len(subject.split()):]
    negative = False
    auxiliary = None
    if remaining and remaining[0] in _CONTRACTIONS:
        auxiliary = _CONTRACTIONS[remaining.pop(0)]
        negative = True
    elif len(remaining) >= 2 and remaining[0] in _AUX and remaining[1] == "not":
        auxiliary = remaining[0]
        remaining = remaining[2:]
        negative = True
    if not remaining:
        return _abstain("missing_action")
    if any(t in {"not", "never", "do", "does", "did", "don't", "doesn't", "didn't"}
           for t in remaining):
        return _abstain("unsupported_negation")
    action_form = remaining[0]
    action = _VERB_FORMS.get(action_form)
    if action is None:
        return _abstain("unsupported_action")
    singular = subject in _SINGULAR
    if negative:
        if action_form != action or (auxiliary == "does") != singular and auxiliary != "did":
            return _abstain("invalid_negative_agreement")
    elif (action_form != action) != singular:
        return _abstain("invalid_verb_agreement")
    if len(remaining) != 3 or remaining[1] not in _DETERMINERS or remaining[2] not in NOUNS:
        return _abstain("unsupported_object")
    return ExpandedFrame("resolved", subject, action, " ".join(remaining[1:]),
                         "negative" if negative else "positive", ())


def expanded_english_dict(text: str) -> dict:
    frame = analyze_expanded_english(text)
    return {
        "contract": "future-xsus-core.expanded-english.v1",
        "status": frame.status, "subject": frame.subject,
        "action": frame.action, "object": frame.object,
        "polarity": frame.polarity, "reasons": frame.reasons,
        "production_authorized": False,
        "open_domain_understanding_proven": False,
    }
