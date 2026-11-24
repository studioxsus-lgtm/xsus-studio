"""Conservative spelling suggestions for individual Albanian words."""
from dataclasses import dataclass
from .text import WORDS, normalize
from .verbs import analyze_verb
from .nominals import analyze_nominal

_PROTECTED = frozenset({"xsus", "api", "html", "css", "javascript", "python",
                        "json", "sql", "github", "android", "ios", "typescript",
                        "react", "supabase", "http", "https", "url", "uuid"})

def _fold(word: str) -> str:
    return word.replace("ë", "e").replace("ç", "c")

_INDEX: dict[str, list[str]] = {}
for word in sorted(WORDS):
    _INDEX.setdefault(_fold(word), []).append(word)

@dataclass(frozen=True, slots=True)
class SpellingResult:
    original: str
    status: str
    suggestions: tuple[str, ...] = ()

def check_word(word: str) -> SpellingResult:
    """Suggest only dictionary-backed diacritic variants; never rewrite input."""
    if not isinstance(word, str):
        raise TypeError("word must be a string")
    normalized = normalize(word)
    if (not normalized or len(normalized) > 128 or not normalized.isalpha()
            or normalized in _PROTECTED or word.isupper()
            or any(ch.isupper() for ch in word[1:])):
        return SpellingResult(word, "protected")
    if normalized in WORDS or analyze_verb(normalized) or analyze_nominal(normalized):
        return SpellingResult(word, "known")
    candidates = tuple(_INDEX.get(_fold(normalized), ()))
    if candidates:
        return SpellingResult(word, "suggestion", candidates)
    return SpellingResult(word, "unknown")
