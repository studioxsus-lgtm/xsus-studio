"""Restricted semantic frames derived from supported Albanian clauses."""
from dataclasses import dataclass
from .advanced_syntax import parse_extended_clause
from .questions import parse_marked_question
from .verbs import analyze_verb
from .nominals import analyze_nominal

_ACTIONS = {"krijoj": "create", "ndërtoj": "build", "zhvilloj": "develop",
            "hap": "open", "mbyll": "close", "shkruaj": "write",
            "lexoj": "read", "mësoj": "learn"}
_OBJECTS = {"aplikacion": "application", "projekt": "project",
            "faqe": "page", "detyrë": "task", "kërkesë": "request",
            "përgjigje": "response", "libër": "book"}

@dataclass(frozen=True, slots=True)
class SemanticFrame:
    actor: str
    action: str
    target: str | None
    negated: bool
    interrogative: bool

def analyze_semantics(text: str) -> tuple[SemanticFrame, ...]:
    parsed = parse_marked_question(text) or parse_extended_clause(text)
    if parsed is None:
        return ()
    frames = []
    for clause, negated in zip(parsed.clauses, parsed.negated, strict=True):
        if not clause.agreement:
            return ()
        lemmas = {r.lemma for r in analyze_verb(clause.predicate)}
        if len(lemmas) != 1:
            return ()
        action = _ACTIONS.get(next(iter(lemmas)))
        if action is None:
            return ()
        target = None
        if clause.object is not None:
            nouns = {r.lemma for r in analyze_nominal(clause.object)
                     if r.pos == "NOUN" and r.case == "Acc"}
            if len(nouns) != 1:
                return ()
            target = _OBJECTS.get(next(iter(nouns)))
            if target is None:
                return ()
        frames.append(SemanticFrame(clause.subject, action, target,
                                    negated, parsed.interrogative))
    return tuple(frames)
