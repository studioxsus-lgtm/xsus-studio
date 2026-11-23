"""Conservative Albanian morphology v0.1: explicit paradigms, no guessed analyses."""
from dataclasses import dataclass
from .text import normalize

@dataclass(frozen=True, slots=True)
class Analysis:
    lemma: str
    pos: str
    features: tuple[str, ...]

# Explicit forms only. Ambiguity is preserved rather than guessed away.
_PARADIGMS = {
    "jam": {
        "jam": ("Person=1", "Number=Sing", "Tense=Pres"),
        "je": ("Person=2", "Number=Sing", "Tense=Pres"),
        "është": ("Person=3", "Number=Sing", "Tense=Pres"),
        "jemi": ("Person=1", "Number=Plur", "Tense=Pres"),
        "jeni": ("Person=2", "Number=Plur", "Tense=Pres"),
        "janë": ("Person=3", "Number=Plur", "Tense=Pres"),
    },
    "kam": {
        "kam": ("Person=1", "Number=Sing", "Tense=Pres"),
        "ke": ("Person=2", "Number=Sing", "Tense=Pres"),
        "ka": ("Person=3", "Number=Sing", "Tense=Pres"),
        "kemi": ("Person=1", "Number=Plur", "Tense=Pres"),
        "keni": ("Person=2", "Number=Plur", "Tense=Pres"),
        "kanë": ("Person=3", "Number=Plur", "Tense=Pres"),
    },
    "libër": {
        "libër": ("Number=Sing", "Definite=Ind"),
        "libri": ("Number=Sing", "Definite=Def"),
        "libra": ("Number=Plur", "Definite=Ind"),
        "librat": ("Number=Plur", "Definite=Def"),
    },
    "shkollë": {
        "shkollë": ("Number=Sing", "Definite=Ind"),
        "shkolla": ("Number=Sing", "Definite=Def"),
        "shkollat": ("Number=Plur", "Definite=Def"),
    },
}
_POS = {"jam": "AUX", "kam": "VERB", "libër": "NOUN", "shkollë": "NOUN"}
_INDEX: dict[str, list[Analysis]] = {}
for lemma, forms in _PARADIGMS.items():
    for surface, features in forms.items():
        _INDEX.setdefault(surface, []).append(Analysis(lemma, _POS[lemma], features))

def analyze(word: str) -> tuple[Analysis, ...]:
    """Return all known analyses; unknown forms return an empty tuple."""
    return tuple(_INDEX.get(normalize(word), ()))

def inflect(lemma: str, **features: str) -> tuple[str, ...]:
    """Return only attested forms matching every requested feature."""
    canonical = normalize(lemma)
    if canonical not in _PARADIGMS:
        return ()
    requested = {f"{key}={value}" for key, value in features.items()}
    return tuple(surface for surface, tags in _PARADIGMS[canonical].items()
                 if requested.issubset(tags))
