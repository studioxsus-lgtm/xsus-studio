"""Conservative English intent recognition for explicit formal commands.

No language model, entity extraction beyond a single formal atom, or
interpretation of ambiguous natural-language instructions.
"""
from dataclasses import dataclass
import re
from .reasoning_v1 import _atom

_PROVE = (
    re.compile(r"^prove ([a-z][a-z0-9_]{0,63})$", re.I),
    re.compile(r"^can you prove ([a-z][a-z0-9_]{0,63})\??$", re.I),
    re.compile(r"^is ([a-z][a-z0-9_]{0,63}) provable\??$", re.I),
)
_HISTORY = frozenset(("history", "show conversation history",
                      "how many exchanges", "how many exchanges?"))


@dataclass(frozen=True, slots=True)
class EnglishIntent:
    status: str
    kind: str | None
    atom: str | None
    limitations: tuple[str, ...]


def parse_english_intent(text: str) -> EnglishIntent:
    if not isinstance(text, str) or not 1 <= len(text.strip()) <= 2000:
        raise ValueError("invalid English input")
    normalized = " ".join(text.strip().split())
    if normalized.casefold() in _HISTORY:
        return EnglishIntent("resolved", "history", None,
                             ("session_metadata_only",))
    matches = []
    for pattern in _PROVE:
        match = pattern.fullmatch(normalized)
        if match:
            matches.append(match.group(1).lower())
    if len(matches) == 1:
        try:
            atom = _atom(matches[0])
        except ValueError:
            return EnglishIntent("abstained", None, None,
                                 ("invalid_symbolic_atom",))
        return EnglishIntent("resolved", "prove", atom,
                             ("formal_symbol_only", "not_real_world_truth"))
    return EnglishIntent("abstained", None, None,
                         ("unsupported_or_ambiguous_english_intent",))
