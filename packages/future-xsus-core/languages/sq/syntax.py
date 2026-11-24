"""Conservative Albanian syntax: recognizes only explicitly supported S-V-(O) patterns.

This is a starter parser, not a general Albanian dependency parser.
"""
from dataclasses import dataclass
from .text import normalize, tokenize
from .verbs import analyze_verb
from .nominals import analyze_nominal

_SUBJECTS = {
    "unë": (1, "Sing"), "ti": (2, "Sing"), "ai": (3, "Sing"),
    "ajo": (3, "Sing"), "ne": (1, "Plur"), "ju": (2, "Plur"),
    "ata": (3, "Plur"), "ato": (3, "Plur"),
}
_TRANSITIVE = frozenset({"lexoj", "mësoj", "krijoj", "ndërtoj", "zhvilloj", "shkruaj", "hap", "mbyll", "kam"})
_PUNCTUATION = {".", "!", "?"}

@dataclass(frozen=True, slots=True)
class Clause:
    subject: str
    predicate: str
    object: str | None
    agreement: bool
    pattern: str

def parse_clause(text: str) -> Clause | None:
    """Parse one simple overt-subject SVO/SV clause; unknown input returns None."""
    if not isinstance(text, str):
        raise TypeError("text must be a string")
    words = [normalize(token) for token in tokenize(text)]
    if words and words[-1] in _PUNCTUATION:
        words.pop()
    if len(words) not in (2, 3) or words[0] not in _SUBJECTS:
        return None
    subject = words[0]
    readings = analyze_verb(words[1])
    if not readings:
        return None
    person, number = _SUBJECTS[subject]
    agreeing = any(r.person == person and r.number == number for r in readings)
    if len(words) == 3 and not any(r.lemma in _TRANSITIVE for r in readings):
        return None
    if len(words) == 3 and not any(
        r.pos == "NOUN" and r.case == "Acc" for r in analyze_nominal(words[2])
    ):
        return None
    return Clause(subject, words[1], words[2] if len(words) == 3 else None,
                  agreeing, "SVO" if len(words) == 3 else "SV")
