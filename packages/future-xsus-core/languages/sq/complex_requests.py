"""Bounded composition of application requirements using the technical registry."""
from dataclasses import dataclass
import re
from .text import normalize
from .technical_lexicon import lookup_technical_term
from .technical_requests import analyze_technical_request

@dataclass(frozen=True, slots=True)
class ApplicationRequirements:
    action: str
    platform: str | None
    features: tuple[str, ...]

def analyze_requirements(text: str) -> ApplicationRequirements | None:
    if not isinstance(text, str):
        raise TypeError("Expected text")
    if len(text) > 4096:
        return None
    value = " ".join(normalize(text).split()).removesuffix(".")
    restaurant = re.fullmatch(
        r"(?:(?:më )?(?:krijo|ndërto|zhvillo)|dua) (?:një )?(?:aplikacion|app) android për "
        r"(?:(?:një )?restorant|restorantin tim)(?:,? me (.+))?", value)
    if restaurant:
        terms = set(re.split(r"\s*,\s*(?:dhe\s+)?|\s+dhe\s+", restaurant[1] or "menu dhe porosi"))
        if {"menu", "porosi"} <= terms <= {"menu", "porosi", "historik", "historik të porosive"}:
            return ApplicationRequirements("create", "android", ("restaurant_orders",))
        return None
    if value.endswith(" me"):
        return None
    head, separator, tail = value.partition(" me ")
    base = analyze_technical_request(head)
    if base is None or base.action != "create" or base.target != "application":
        return None
    features = [base.feature] if base.feature else []
    if separator:
        parts = re.split(r"\s*,\s*|\s+dhe\s+", tail)
        if len(parts) > 16:
            return None
        for part in parts:
            term = lookup_technical_term({"temë të errët": "temë e errët", "temë të çelët": "temë e çelët"}.get(part, part))
            if term is None or term.category not in {"features", "security", "data", "design", "interface"}:
                return None
            if term.concept not in features:
                features.append(term.concept)
    return ApplicationRequirements(base.action, base.platform, tuple(features))

