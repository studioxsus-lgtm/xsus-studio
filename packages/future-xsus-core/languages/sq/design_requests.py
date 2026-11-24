"""Explicit Albanian design preferences, not generated UI."""
from dataclasses import dataclass
import re
from .text import normalize

_STYLES = {"modern": "modern", "minimalist": "minimalist", "profesional": "professional"}
_THEMES = {"temë të errët": "dark", "temë të çelët": "light"}
_COLORS = {"blu": "blue", "jeshile": "green", "vjollcë": "purple", "e kuqe": "red", "e bardhë": "white", "e zezë": "black"}
_OPTIONS = {"animacione": "animation", "navigim të poshtëm": "bottom_navigation", "menu anësore": "sidebar", "dizajn responsive": "responsive", "tipografi moderne": "modern_typography", "pa animacione": "no_animation"}

@dataclass(frozen=True, slots=True)
class DesignSpec:
    style: str
    theme: str | None
    primary_color: str | None
    options: tuple[str, ...]
    execution_authorized: bool = False

def analyze_design(text: str) -> DesignSpec | None:
    if not isinstance(text, str):
        raise TypeError("Expected text")
    if len(text) > 4096:
        return None
    value = " ".join(normalize(text).split()).removesuffix(".")
    match = re.fullmatch(r"(?:krijo|projekto) (?:një )?dizajn (modern|minimalist|profesional)(?: me (.+))?", value)
    if not match:
        return None
    theme = color = None
    options = []
    parts = re.split(r"\s*,\s*|\s+dhe\s+", match[2]) if match[2] else []
    if len(parts) > 16:
        return None
    for part in parts:
        if part in _THEMES:
            candidate = _THEMES[part]
            if theme is not None and theme != candidate:
                return None
            theme = candidate
        elif part.startswith("ngjyrë ") and part[7:] in _COLORS:
            candidate = _COLORS[part[7:]]
            if color is not None and color != candidate:
                return None
            color = candidate
        elif part in _OPTIONS:
            option = _OPTIONS[part]
            if option not in options:
                options.append(option)
        else:
            return None
    if {"animation", "no_animation"}.issubset(options):
        return None
    return DesignSpec(_STYLES[match[1]], theme, color, tuple(options))
