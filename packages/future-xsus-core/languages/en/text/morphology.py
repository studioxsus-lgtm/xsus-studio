"""English verb and noun inflection with a small explicit exception lexicon."""

import re
from dataclasses import dataclass
from enum import StrEnum
from functools import lru_cache

_WORD = re.compile(r"[a-z]+(?:-[a-z]+)*", re.IGNORECASE | re.ASCII)
_VOWELS = frozenset("aeiou")
_DOUBLED_VERBS = frozenset({
    "admit", "begin", "commit", "compel", "control", "drop", "equip", "fit", "format", "occur",
    "omit", "permit", "plan", "prefer", "refer", "regret", "stop", "submit", "transfer",
})
_KEEP_E = frozenset({"age", "dye", "singe"})

_IRREGULAR_VERBS = {
    "arise": ("arises", "arose", "arisen", "arising"),
    "awake": ("awakes", "awoke", "awoken", "awaking"),
    "bear": ("bears", "bore", "borne", "bearing"),
    "beat": ("beats", "beat", "beaten", "beating"),
    "bend": ("bends", "bent", "bent", "bending"),
    "bet": ("bets", "bet", "bet", "betting"),
    "become": ("becomes", "became", "become", "becoming"),
    "be": ("is", "was", "been", "being"),
    "begin": ("begins", "began", "begun", "beginning"),
    "break": ("breaks", "broke", "broken", "breaking"),
    "bring": ("brings", "brought", "brought", "bringing"),
    "build": ("builds", "built", "built", "building"),
    "buy": ("buys", "bought", "bought", "buying"),
    "bite": ("bites", "bit", "bitten", "biting"),
    "bleed": ("bleeds", "bled", "bled", "bleeding"),
    "blow": ("blows", "blew", "blown", "blowing"),
    "broadcast": ("broadcasts", "broadcast", "broadcast", "broadcasting"),
    "burn": ("burns", "burned", "burned", "burning"),
    "burst": ("bursts", "burst", "burst", "bursting"),
    "cast": ("casts", "cast", "cast", "casting"),
    "catch": ("catches", "caught", "caught", "catching"),
    "choose": ("chooses", "chose", "chosen", "choosing"),
    "cling": ("clings", "clung", "clung", "clinging"),
    "come": ("comes", "came", "come", "coming"),
    "cost": ("costs", "cost", "cost", "costing"),
    "creep": ("creeps", "crept", "crept", "creeping"),
    "cut": ("cuts", "cut", "cut", "cutting"),
    "deal": ("deals", "dealt", "dealt", "dealing"),
    "dig": ("digs", "dug", "dug", "digging"),
    "do": ("does", "did", "done", "doing"),
    "draw": ("draws", "drew", "drawn", "drawing"),
    "drink": ("drinks", "drank", "drunk", "drinking"),
    "drive": ("drives", "drove", "driven", "driving"),
    "eat": ("eats", "ate", "eaten", "eating"),
    "fall": ("falls", "fell", "fallen", "falling"),
    "feed": ("feeds", "fed", "fed", "feeding"),
    "feel": ("feels", "felt", "felt", "feeling"),
    "fight": ("fights", "fought", "fought", "fighting"),
    "find": ("finds", "found", "found", "finding"),
    "fly": ("flies", "flew", "flown", "flying"),
    "forget": ("forgets", "forgot", "forgotten", "forgetting"),
    "forbid": ("forbids", "forbade", "forbidden", "forbidding"),
    "freeze": ("freezes", "froze", "frozen", "freezing"),
    "get": ("gets", "got", "gotten", "getting"),
    "give": ("gives", "gave", "given", "giving"),
    "go": ("goes", "went", "gone", "going"),
    "grow": ("grows", "grew", "grown", "growing"),
    "have": ("has", "had", "had", "having"),
    "hang": ("hangs", "hung", "hung", "hanging"),
    "hear": ("hears", "heard", "heard", "hearing"),
    "hide": ("hides", "hid", "hidden", "hiding"),
    "hit": ("hits", "hit", "hit", "hitting"),
    "hold": ("holds", "held", "held", "holding"),
    "hurt": ("hurts", "hurt", "hurt", "hurting"),
    "keep": ("keeps", "kept", "kept", "keeping"),
    "know": ("knows", "knew", "known", "knowing"),
    "lay": ("lays", "laid", "laid", "laying"),
    "leave": ("leaves", "left", "left", "leaving"),
    "lead": ("leads", "led", "led", "leading"),
    "lend": ("lends", "lent", "lent", "lending"),
    "let": ("lets", "let", "let", "letting"),
    "light": ("lights", "lit", "lit", "lighting"),
    "lose": ("loses", "lost", "lost", "losing"),
    "make": ("makes", "made", "made", "making"),
    "mean": ("means", "meant", "meant", "meaning"),
    "meet": ("meets", "met", "met", "meeting"),
    "pay": ("pays", "paid", "paid", "paying"),
    "put": ("puts", "put", "put", "putting"),
    "quiz": ("quizzes", "quizzed", "quizzed", "quizzing"),
    "read": ("reads", "read", "read", "reading"),
    "ride": ("rides", "rode", "ridden", "riding"),
    "ring": ("rings", "rang", "rung", "ringing"),
    "rise": ("rises", "rose", "risen", "rising"),
    "run": ("runs", "ran", "run", "running"),
    "say": ("says", "said", "said", "saying"),
    "set": ("sets", "set", "set", "setting"),
    "see": ("sees", "saw", "seen", "seeing"),
    "sell": ("sells", "sold", "sold", "selling"),
    "seek": ("seeks", "sought", "sought", "seeking"),
    "send": ("sends", "sent", "sent", "sending"),
    "shoot": ("shoots", "shot", "shot", "shooting"),
    "show": ("shows", "showed", "shown", "showing"),
    "sink": ("sinks", "sank", "sunk", "sinking"),
    "slide": ("slides", "slid", "slid", "sliding"),
    "sit": ("sits", "sat", "sat", "sitting"),
    "sleep": ("sleeps", "slept", "slept", "sleeping"),
    "shake": ("shakes", "shook", "shaken", "shaking"),
    "shut": ("shuts", "shut", "shut", "shutting"),
    "sing": ("sings", "sang", "sung", "singing"),
    "speak": ("speaks", "spoke", "spoken", "speaking"),
    "spin": ("spins", "spun", "spun", "spinning"),
    "split": ("splits", "split", "split", "splitting"),
    "spend": ("spends", "spent", "spent", "spending"),
    "spread": ("spreads", "spread", "spread", "spreading"),
    "stand": ("stands", "stood", "stood", "standing"),
    "steal": ("steals", "stole", "stolen", "stealing"),
    "stick": ("sticks", "stuck", "stuck", "sticking"),
    "strike": ("strikes", "struck", "struck", "striking"),
    "sweep": ("sweeps", "swept", "swept", "sweeping"),
    "swim": ("swims", "swam", "swum", "swimming"),
    "take": ("takes", "took", "taken", "taking"),
    "tear": ("tears", "tore", "torn", "tearing"),
    "teach": ("teaches", "taught", "taught", "teaching"),
    "tell": ("tells", "told", "told", "telling"),
    "think": ("thinks", "thought", "thought", "thinking"),
    "throw": ("throws", "threw", "thrown", "throwing"),
    "understand": ("understands", "understood", "understood", "understanding"),
    "upset": ("upsets", "upset", "upset", "upsetting"),
    "wake": ("wakes", "woke", "woken", "waking"),
    "wear": ("wears", "wore", "worn", "wearing"),
    "withdraw": ("withdraws", "withdrew", "withdrawn", "withdrawing"),
    "win": ("wins", "won", "won", "winning"),
    "write": ("writes", "wrote", "written", "writing"),
}
_IRREGULAR_NOUNS = {
    "alumnus": "alumni", "analysis": "analyses", "appendix": "appendices", "axis": "axes",
    "basis": "bases", "bacterium": "bacteria", "cactus": "cacti", "calf": "calves",
    "child": "children", "crisis": "crises", "criterion": "criteria", "datum": "data",
    "deer": "deer", "diagnosis": "diagnoses", "focus": "foci", "foot": "feet", "fungus": "fungi",
    "goose": "geese", "half": "halves", "hypothesis": "hypotheses", "index": "indices",
    "knife": "knives", "leaf": "leaves", "life": "lives", "loaf": "loaves", "man": "men",
    "matrix": "matrices", "medium": "media", "mouse": "mice", "nucleus": "nuclei", "oasis": "oases",
    "parenthesis": "parentheses", "person": "people", "phenomenon": "phenomena", "quiz": "quizzes",
    "radius": "radii", "series": "series", "sheep": "sheep", "shelf": "shelves", "species": "species",
    "stomach": "stomachs", "stimulus": "stimuli", "syllabus": "syllabi", "thesis": "theses",
    "thief": "thieves", "tooth": "teeth", "vertex": "vertices", "wife": "wives", "wolf": "wolves",
    "woman": "women",
}
_ES_NOUNS = frozenset({"echo", "hero", "mosquito", "potato", "tomato", "volcano"})


class VerbForm(StrEnum):
    BASE = "base"
    THIRD_PERSON = "third_person_singular"
    PAST = "past"
    PAST_PARTICIPLE = "past_participle"
    PRESENT_PARTICIPLE = "present_participle"
    FIRST_PERSON = "first_person_singular"
    NON_THIRD_PRESENT = "non_third_present"
    NON_SINGULAR_PAST = "non_singular_past"
    MODAL = "modal"


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
