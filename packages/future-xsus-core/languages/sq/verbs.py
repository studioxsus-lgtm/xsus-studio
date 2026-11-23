"""Explicit Albanian verb forms, with tense/mood features and no speculative inflection."""
from dataclasses import dataclass
from .text import normalize

@dataclass(frozen=True, slots=True)
class VerbForm:
    lemma: str
    surface: str
    person: int
    number: str
    tense: str
    mood: str = "Ind"

# Each row is ordered: 1sg, 2sg, 3sg, 1pl, 2pl, 3pl.
# The inventory is intentionally small and auditable. More tenses require
# linguistic review, particularly compound forms and regional variants.
_PARADIGMS = {
    "jam": {
        ("Pres", "Ind"): ("jam", "je", "është", "jemi", "jeni", "janë"),
        ("Imp", "Ind"): ("isha", "ishe", "ishte", "ishim", "ishit", "ishin"),
    },
    "kam": {
        ("Pres", "Ind"): ("kam", "ke", "ka", "kemi", "keni", "kanë"),
        ("Imp", "Ind"): ("kisha", "kishe", "kishte", "kishim", "kishit", "kishin"),
        ("Aor", "Ind"): ("pata", "pate", "pati", "patëm", "patët", "patën"),
    },
    "punoj": {
        ("Pres", "Ind"): ("punoj", "punon", "punon", "punojmë", "punoni", "punojnë"),
        ("Imp", "Ind"): ("punoja", "punoje", "punonte", "punonim", "punonit", "punonin"),
    },
}
_PERSON_NUMBER = ((1, "Sing"), (2, "Sing"), (3, "Sing"), (1, "Plur"), (2, "Plur"), (3, "Plur"))
_INDEX: dict[str, list[VerbForm]] = {}
for lemma, paradigms in _PARADIGMS.items():
    for (tense, mood), forms in paradigms.items():
        for (person, number), surface in zip(_PERSON_NUMBER, forms, strict=True):
            _INDEX.setdefault(surface, []).append(VerbForm(lemma, surface, person, number, tense, mood))

def conjugate(lemma: str, *, person: int, number: str, tense: str = "Pres",
              mood: str = "Ind") -> str | None:
    """Return an attested form, or None for an unsupported combination."""
    if not isinstance(lemma, str):
        raise TypeError("lemma must be a string")
    if type(person) is not int or person not in (1, 2, 3):
        raise ValueError("person must be 1, 2 or 3")
    if number not in ("Sing", "Plur"):
        raise ValueError("number must be Sing or Plur")
    forms = _PARADIGMS.get(normalize(lemma), {}).get((tense, mood))
    if forms is None:
        return None
    index = (person - 1) + (3 if number == "Plur" else 0)
    return forms[index]

def analyze_verb(surface: str) -> tuple[VerbForm, ...]:
    """Return every attested analysis, preserving homographic ambiguity."""
    return tuple(_INDEX.get(normalize(surface), ()))
