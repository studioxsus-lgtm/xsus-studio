"""Albanian nominal morphology: explicitly verified starter paradigms.

No productive suffix rules are assumed. Ambiguous surface forms retain all
analyses. Features describe nominative/accusative singular/plural where known.
"""
from dataclasses import dataclass
from .text import normalize

@dataclass(frozen=True, slots=True)
class NominalAnalysis:
    lemma: str
    pos: str
    gender: str | None
    number: str
    case: str
    definite: str

# Format: lemma -> (part of speech, gender, (surface, number, case, definite)...)
# A narrow starter inventory avoids pretending to cover Albanian declension.
_ENTRIES = {
    "libër": ("NOUN", "Masc", (
        ("libër", "Sing", "Nom", "Ind"),
        ("libri", "Sing", "Nom", "Def"),
        ("libra", "Plur", "Nom", "Ind"),
        ("librat", "Plur", "Nom", "Def"),
        ("librin", "Sing", "Acc", "Def"),
    )),
    "shkollë": ("NOUN", "Fem", (
        ("shkollë", "Sing", "Nom", "Ind"),
        ("shkolla", "Sing", "Nom", "Def"),
        ("shkolla", "Plur", "Nom", "Ind"),
        ("shkollat", "Plur", "Nom", "Def"),
        ("shkollën", "Sing", "Acc", "Def"),
    )),
    "unë": ("PRON", None, (
        ("unë", "Sing", "Nom", "Ind"),
        ("mua", "Sing", "Acc", "Ind"),
    )),
    "ti": ("PRON", None, (
        ("ti", "Sing", "Nom", "Ind"),
        ("ty", "Sing", "Acc", "Ind"),
    )),
}
_INDEX: dict[str, list[NominalAnalysis]] = {}
for lemma, (pos, gender, forms) in _ENTRIES.items():
    for surface, number, case, definite in forms:
        _INDEX.setdefault(surface, []).append(
            NominalAnalysis(lemma, pos, gender, number, case, definite)
        )

def analyze_nominal(surface: str) -> tuple[NominalAnalysis, ...]:
    """Return every listed analysis, or an empty tuple for unknown words."""
    return tuple(_INDEX.get(normalize(surface), ()))

def decline(lemma: str, *, number: str, case: str = "Nom",
            definite: str = "Ind") -> tuple[str, ...]:
    """Return deduplicated attested forms for a feature combination."""
    if not isinstance(lemma, str):
        raise TypeError("lemma must be a string")
    if number not in ("Sing", "Plur"):
        raise ValueError("number must be Sing or Plur")
    if case not in ("Nom", "Acc", "Gen", "Dat", "Abl"):
        raise ValueError("invalid case")
    if definite not in ("Ind", "Def"):
        raise ValueError("definite must be Ind or Def")
    entry = _ENTRIES.get(normalize(lemma))
    if entry is None:
        return ()
    seen = dict.fromkeys(
        surface for surface, n, c, d in entry[2]
        if (n, c, d) == (number, case, definite)
    )
    return tuple(seen)
