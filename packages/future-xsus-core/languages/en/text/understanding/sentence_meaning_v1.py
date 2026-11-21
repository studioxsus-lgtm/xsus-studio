"""Phase 2: opt-in, bounded English sentence meaning frames.

Extracts explicitly present agent/action/patient from a small controlled
grammar. No implicit world knowledge, reference resolution or live routing.
"""
from dataclasses import dataclass
import re

_TOKEN = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")
_SUBJECTS = frozenset({"i", "you", "he", "she", "we", "they", "the user", "the teacher", "the student", "the developer", "the engine", "the model", "the system"})
_ACTIONS = frozenset({"read", "reads", "write", "writes", "build", "builds", "check", "checks", "open", "opens", "send", "sends", "review", "reviews", "create", "creates", "update", "updates", "delete", "deletes", "test", "tests"})
_LEMMAS = {form: lemma for lemma, forms in {
    "read": ("read", "reads"), "write": ("write", "writes"),
    "build": ("build", "builds"), "check": ("check", "checks"),
    "open": ("open", "opens"), "send": ("send", "sends"),
    "review": ("review", "reviews"), "create": ("create", "creates"),
    "update": ("update", "updates"), "delete": ("delete", "deletes"),
    "test": ("test", "tests"),
}.items() for form in forms}
_OBJECTS = frozenset({"the report", "the file", "the project", "the code", "the message", "the document", "the application", "the test", "the model", "the plan", "a report", "a file", "a project", "a message", "a document", "a test"})
_NEGATORS = frozenset({"not", "never", "no", "without", "cannot"})
_NEG_AUX = frozenset({"do", "does", "did", "will", "can"})
_AUX_NEG = {"don't": "do", "doesn't": "does", "didn't": "did", "won't": "will", "can't": "can"}
_VALID_END = re.compile(r"^[A-Za-z]+(?:'[A-Za-z]+)?(?: [A-Za-z]+(?:'[A-Za-z]+)?)*[.!]?$")


@dataclass(frozen=True, slots=True)
class SentenceFrame:
    status: str
    subject: str | None
    action: str | None
    object: str | None
    polarity: str | None
    confidence: str
    reasons: tuple[str, ...]


def _abstain(reason: str) -> SentenceFrame:
    return SentenceFrame("abstained", None, None, None, None, "none", (reason,))


def analyze_sentence_meaning(text: str) -> SentenceFrame:
    if not isinstance(text, str) or not text.strip() or len(text) > 10000:
        raise ValueError("text must contain 1 to 10000 characters")
    sentence = text.strip()
    if not _VALID_END.fullmatch(sentence):
        return _abstain("unsupported_sentence_structure")
    tokens = [m.group().casefold() for m in _TOKEN.finditer(sentence)]
    if not tokens or len(tokens) > 12:
        return _abstain("unsupported_length")
    if any(t in {"and", "or", "but", "because", "if", "that", "who", "which"} for t in tokens):
        return _abstain("complex_clause")
    if sentence.endswith("?"):
        return _abstain("question_out_of_scope")
    subjects = [(s, s.split()) for s in sorted(_SUBJECTS, key=len, reverse=True)]
    subject = next((s for s, words in subjects if tokens[:len(words)] == words), None)
    if subject is None:
        return _abstain("unsupported_subject")
    remaining = tokens[len(subject.split()):]
    negated = False
    if remaining and remaining[0] in _AUX_NEG:
        negated = True
        remaining = remaining[1:]
    elif len(remaining) >= 2 and remaining[0] in _NEG_AUX and remaining[1] == "not":
        negated = True
        remaining = remaining[2:]
    elif remaining and remaining[0] in _NEG_AUX:
        return _abstain("unsupported_auxiliary")
    if any(token in _NEGATORS or token in _NEG_AUX or token in _AUX_NEG for token in remaining):
        return _abstain("unscoped_negation_or_auxiliary")
    if not remaining or remaining[0] not in _ACTIONS:
        return _abstain("unsupported_action")
    verb = remaining[0]
    # Negated auxiliary requires the bare verb; avoid accepting
    # "does not reads" as a meaningful controlled-language sentence.
    if negated and verb != _LEMMAS[verb]:
        return _abstain("invalid_negated_verb")
    obj = " ".join(remaining[1:])
    if obj not in _OBJECTS:
        return _abstain("unsupported_object")
    return SentenceFrame("resolved", subject, _LEMMAS[verb], obj,
                         "negative" if negated else "positive", "bounded", ())


def sentence_frame_dict(text: str) -> dict:
    """Structured output contains no source sentence or arbitrary text."""
    frame = analyze_sentence_meaning(text)
    return {
        "contract": "future-xsus-core.sentence-meaning.v1",
        "status": frame.status,
        "subject": frame.subject,
        "action": frame.action,
        "object": frame.object,
        "polarity": frame.polarity,
        "confidence": frame.confidence,
        "reasons": frame.reasons,
        "production_authorized": False,
        "open_domain_understanding_proven": False,
    }
