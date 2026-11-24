"""Restricted technical request recognition; never authorizes execution."""
from dataclasses import dataclass
from .text import normalize
import re

@dataclass(frozen=True, slots=True)
class TechnicalRequest:
    action: str
    target: str
    platform: str | None = None
    feature: str | None = None

_RULES = (
    (r"(?:krijo|ndërto|zhvillo) (?:një )?aplikacion(?: (android|ios|web))?", "create", "application", None),
    (r"(?:krijo|ndërto) (?:një )?aplikacion për menaxhimin e detyrave", "create", "application", "task_management"),
    (r"shto (?:sistemin|funksionin) e autentikimit", "add", "application", "authentication"),
    (r"shto (?:sistemin|funksionin) e pagesave", "add", "application", "payments"),
    (r"ndrysho dizajnin e aplikacionit", "update", "application", "design"),
    (r"krijo (?:një )?(?:databazë|bazë të dhënash)", "create", "database", None),
)

def analyze_technical_request(text: str) -> TechnicalRequest | None:
    if not isinstance(text, str):
        raise TypeError("text must be a string")
    if len(text) > 4096:
        return None
    value = " ".join(normalize(text).split())
    if value.endswith("."):
        value = value[:-1]
    for pattern, action, target, feature in _RULES:
        match = re.fullmatch(pattern, value)
        if match:
            return TechnicalRequest(action, target, match.group(1) if match.lastindex else None, feature)
    return None
