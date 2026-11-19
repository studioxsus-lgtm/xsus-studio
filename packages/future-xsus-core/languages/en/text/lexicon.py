"""Load the versioned, local vocabulary used by the English clause parser."""

import json
import re
from dataclasses import dataclass
from pathlib import Path

from .morphology import inflect_verb, pluralize_noun

_LEXICON_PATH = Path(__file__).resolve().parents[1] / "data" / "lexicon" / "general-v2.json"
_WORD = re.compile(r"[a-z]+(?:-[a-z]+)*", re.ASCII)


@dataclass(frozen=True, slots=True)
class EnglishLexicon:
    nouns: frozenset[str]
    mass_nouns: frozenset[str]
    adjectives: frozenset[str]
    verbs: frozenset[str]
    transitive_verbs: frozenset[str]
    agent_nouns: frozenset[str]
    determiners: frozenset[str]
    singular_pronouns: frozenset[str]
    adverbs: frozenset[str]


def _unique_entries(pairs: list[tuple[str, object]]) -> dict[str, object]:
    entries = {}
    for key, value in pairs:
        if key in entries:
            raise ValueError(f"Duplicate English lexicon field: {key}")
        entries[key] = value
    return entries


def _word_set(value: object, label: str) -> frozenset[str]:
    if not isinstance(value, list) or not value:
        raise ValueError(f"English lexicon {label} must be a nonempty word list")
    if any(not isinstance(word, str) or word != word.lower() or _WORD.fullmatch(word) is None for word in value):
        raise ValueError(f"English lexicon {label} contains an invalid word")
    if len(value) != len(set(value)):
        raise ValueError(f"English lexicon {label} contains duplicate words")
    return frozenset(value)


def _load_lexicon() -> EnglishLexicon:
    raw = json.loads(_LEXICON_PATH.read_text(encoding="utf-8"), object_pairs_hook=_unique_entries)
    expected = {
        "version", "nouns", "mass_nouns", "adjectives", "verbs", "transitive_verbs", "agent_nouns",
        "determiners", "singular_pronouns", "adverbs",
    }
    if not isinstance(raw, dict) or set(raw) != expected or raw["version"] != 2:
        raise ValueError("Unsupported English lexicon schema")
    nouns = _word_set(raw["nouns"], "nouns")
    mass_nouns = _word_set(raw["mass_nouns"], "mass nouns")
    adjectives = _word_set(raw["adjectives"], "adjectives")
    verbs = _word_set(raw["verbs"], "verbs")
    transitive = _word_set(raw["transitive_verbs"], "transitive verbs")
    agents = _word_set(raw["agent_nouns"], "agent nouns")
    determiners = _word_set(raw["determiners"], "determiners")
    singular_pronouns = _word_set(raw["singular_pronouns"], "singular pronouns")
    adverbs = _word_set(raw["adverbs"], "adverbs")
    if not transitive <= verbs or not agents <= nouns or nouns & mass_nouns:
        raise ValueError("English lexicon word classes are inconsistent")
    for verb in verbs:
        inflect_verb(verb)
    for noun in nouns:
        pluralize_noun(noun)
    return EnglishLexicon(
        nouns, mass_nouns, adjectives, verbs, transitive, agents, determiners, singular_pronouns, adverbs,
    )


GENERAL_ENGLISH = _load_lexicon()
