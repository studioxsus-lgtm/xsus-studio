"""Deterministic written Albanian primitives; no English-engine dependencies."""
import re
import unicodedata

ALPHABET = tuple("a b c ç d dh e ë f g gj h i j k l ll m n nj o p q r rr s sh t th u v x xh y z zh".split())
DIGRAPHS = frozenset({"dh", "gj", "ll", "nj", "rr", "sh", "th", "xh", "zh"})
WORDS = {
    "përshëndetje": "INTJ", "mirëdita": "INTJ", "faleminderit": "INTJ",
    "unë": "PRON", "ti": "PRON", "ai": "PRON", "ajo": "PRON", "ne": "PRON",
    "ju": "PRON", "ata": "PRON", "ato": "PRON",
    "dhe": "CCONJ", "ose": "CCONJ", "por": "CCONJ",
    "në": "ADP", "me": "ADP", "nga": "ADP", "për": "ADP",
    "është": "AUX", "jam": "AUX", "je": "AUX", "jemi": "AUX", "janë": "AUX",
    "shqip": "ADV", "shqipe": "ADJ", "gjuhë": "NOUN", "libër": "NOUN",
    "shtëpi": "NOUN", "shkollë": "NOUN", "fëmijë": "NOUN",
    "mësoj": "VERB", "lexoj": "VERB", "shkruaj": "VERB",
    "mirë": "ADV", "sot": "ADV", "nesër": "ADV",
}
# Conservative evidence: absence of markers is not evidence of English.
MARKERS = frozenset({"përshëndetje", "faleminderit", "është", "shqip", "shqipe", "gjuhë", "shtëpi", "shkollë", "fëmijë", "unë", "në", "për", "nga", "dhe", "jemi", "janë"})
TOKEN_RE = re.compile(r"[^\W\d_]+(?:['’][^\W\d_]+)*|\d+(?:[.,]\d+)*|[^\w\s]", re.UNICODE)

def normalize(text: str) -> str:
    if not isinstance(text, str):
        raise TypeError("text must be a string")
    return unicodedata.normalize("NFC", text).casefold().strip()

def tokenize(text: str) -> list[str]:
    return TOKEN_RE.findall(unicodedata.normalize("NFC", text))

def lookup(word: str) -> str | None:
    return WORDS.get(normalize(word))

def detect_language(text: str) -> str | None:
    tokens = [normalize(token) for token in tokenize(text)]
    if any(token in MARKERS for token in tokens):
        return "sq"
    return None
