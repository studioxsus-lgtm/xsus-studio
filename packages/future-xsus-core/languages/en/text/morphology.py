"""English verb and noun inflection with a small explicit exception lexicon."""

import re
from dataclasses import dataclass
from enum import StrEnum
from functools import lru_cache

_WORD = re.compile(r"[a-z]+(?:-[a-z]+)*", re.IGNORECASE | re.ASCII)
_VOWELS = frozenset("aeiou")
_DOUBLED_VERBS = frozenset({"admit", "begin", "commit", "drop", "fit", "plan", "prefer", "refer", "stop", "submit"})
_KEEP_E = frozenset({"age", "dye", "singe"})

_IRREGULAR_VERBS = {
    "be": ("is", "was", "been", "being"),
    "begin": ("begins", "began", "begun", "beginning"),
    "break": ("breaks", "broke", "broken", "breaking"),
    "bring": ("brings", "brought", "brought", "bringing"),
    "build": ("builds", "built", "built", "building"),
    "buy": ("buys", "bought", "bought", "buying"),
    "choose": ("chooses", "chose", "chosen", "choosing"),
    "come": ("comes", "came", "come", "coming"),
    "do": ("does", "did", "done", "doing"),
    "drink": ("drinks", "drank", "drunk", "drinking"),
    "drive": ("drives", "drove", "driven", "driving"),
    "eat": ("eats", "ate", "eaten", "eating"),
    "fall": ("falls", "fell", "fallen", "falling"),
    "feel": ("feels", "felt", "felt", "feeling"),
    "find": ("finds", "found", "found", "finding"),
    "fly": ("flies", "flew", "flown", "flying"),
    "forget": ("forgets", "forgot", "forgotten", "forgetting"),
    "get": ("gets", "got", "gotten", "getting"),
    "give": ("gives", "gave", "given", "giving"),
    "go": ("goes", "went", "gone", "going"),
    "grow": ("grows", "grew", "grown", "growing"),
    "have": ("has", "had", "had", "having"),
    "hear": ("hears", "heard", "heard", "hearing"),
    "keep": ("keeps", "kept", "kept", "keeping"),
    "know": ("knows", "knew", "known", "knowing"),
    "leave": ("leaves", "left", "left", "leaving"),
    "lose": ("loses", "lost", "lost", "losing"),
    "make": ("makes", "made", "made", "making"),
    "meet": ("meets", "met", "met", "meeting"),
    "pay": ("pays", "paid", "paid", "paying"),
    "put": ("puts", "put", "put", "putting"),
    "quiz": ("quizzes", "quizzed", "quizzed", "quizzing"),
    "read": ("reads", "read", "read", "reading"),
    "rise": ("rises", "rose", "risen", "rising"),
    "run": ("runs", "ran", "run", "running"),
    "say": ("says", "said", "said", "saying"),
    "see": ("sees", "saw", "seen", "seeing"),
    "sell": ("sells", "sold", "sold", "selling"),
    "send": ("sends", "sent", "sent", "sending"),
    "sit": ("sits", "sat", "sat", "sitting"),
    "sleep": ("sleeps", "slept", "slept", "sleeping"),
    "speak": ("speaks", "spoke", "spoken", "speaking"),
    "stand": ("stands", "stood", "stood", "standing"),
    "take": ("takes", "took", "taken", "taking"),
    "teach": ("teaches", "taught", "taught", "teaching"),
    "tell": ("tells", "told", "told", "telling"),
    "think": ("thinks", "thought", "thought", "thinking"),
    "wear": ("wears", "wore", "worn", "wearing"),
    "win": ("wins", "won", "won", "winning"),
    "write": ("writes", "wrote", "written", "writing"),
}
_IRREGULAR_NOUNS = {
    "analysis": "analyses", "child": "children", "deer": "deer", "foot": "feet",
    "goose": "geese", "knife": "knives", "leaf": "leaves", "life": "lives",
    "man": "men", "mouse": "mice", "person": "people", "quiz": "quizzes", "sheep": "sheep",
    "stomach": "stomachs",
    "tooth": "teeth", "wife": "wives", "woman": "women",
}
_ES_NOUNS = frozenset({"echo", "hero", "potato", "tomato"})


class VerbForm(StrEnum):
    BASE = "base"
    THIRD_PERSON = "third_person_singular"
    PAST = "past"
    PAST_PARTICIPLE = "past_participle"
    PRESENT_PARTICIPLE = "present_participle"
    FIRST_PERSON = "first_person_singular"
    NON_THIRD_PRESENT = "non_third_present"
    NON_SINGULAR_PAST = "non_singular_past"


@dataclass(frozen=True, slots=True)
class VerbInflection:
    base: str
    third_person: str
    past: str
    past_participle: str
    present_participle: str

    def forms(self) -> tuple[tuple[str, VerbForm], ...]:
        ordinary = (
            (self.base, VerbForm.BASE), (self.third_person, VerbForm.THIRD_PERSON),
            (self.past, VerbForm.PAST), (self.past_participle, VerbForm.PAST_PARTICIPLE),
            (self.present_participle, VerbForm.PRESENT_PARTICIPLE),
        )
        if self.base == "be":
            return ordinary + (
                ("am", VerbForm.FIRST_PERSON), ("are", VerbForm.NON_THIRD_PRESENT),
                ("were", VerbForm.NON_SINGULAR_PAST),
            )
        return ordinary


def _word(value: str) -> str:
    if not isinstance(value, str) or not _WORD.fullmatch(value):
        raise ValueError("Expected one English word")
    return value.lower()


def _consonant_y(word: str) -> bool:
    return len(word) > 1 and word.endswith("y") and word[-2] not in _VOWELS


def _s_suffix(word: str) -> str:
    if _consonant_y(word):
        return word[:-1] + "ies"
    return word + ("es" if word.endswith(("s", "sh", "ch", "x", "z")) else "s")


@lru_cache(maxsize=512)
def _inflect_verb(base: str) -> VerbInflection:
    if base in _IRREGULAR_VERBS:
        return VerbInflection(base, *_IRREGULAR_VERBS[base])
    doubled = base + base[-1] if base in _DOUBLED_VERBS else base
    if _consonant_y(base):
        past = base[:-1] + "ied"
    else:
        past = doubled + ("d" if base.endswith("e") else "ed")
    if base.endswith("ie"):
        participle = base[:-2] + "ying"
    elif base.endswith("c"):
        past, participle = base + "ked", base + "king"
    elif base.endswith("e") and not base.endswith(("ee", "oe", "ye")) and base not in _KEEP_E:
        participle = base[:-1] + "ing"
    else:
        participle = doubled + "ing"
    return VerbInflection(base, _s_suffix(base), past, past, participle)


def inflect_verb(lemma: str) -> VerbInflection:
    """Return lowercase forms for a supplied verb lemma."""
    return _inflect_verb(_word(lemma))


def pluralize_noun(lemma: str) -> str:
    """Return a lowercase plural using the lexicon and productive spelling rules."""
    noun = _word(lemma)
    if noun in _IRREGULAR_NOUNS:
        return _IRREGULAR_NOUNS[noun]
    return noun + "es" if noun in _ES_NOUNS else _s_suffix(noun)
