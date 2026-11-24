"""Conservative feature planning; inferred dependencies require confirmation."""
from dataclasses import dataclass
from .complex_requests import analyze_requirements
from .technical_lexicon import TERMS

_CATEGORIES = {term.concept: term.category for term in TERMS.values()
               if term.category in {"features", "security", "data", "design", "interface"}}
_DEPENDENCIES = {"authorization": ("authentication",),
                 "role": ("authorization",),
                 "permission": ("authorization",),
                 "backup": ("database",),
                 "migration": ("database",)}
_CONFLICTS = (("dark_theme", "light_theme"),)

@dataclass(frozen=True, slots=True)
class FeaturePlan:
    platform: str | None
    requested: tuple[str, ...]
    categorized: tuple[tuple[str, str], ...]
    suggested_dependencies: tuple[str, ...]
    ordered_features: tuple[str, ...]
    clarification_pairs: tuple[tuple[str, str], ...]
    execution_authorized: bool = False

def plan_features(text: str) -> FeaturePlan | None:
    requirements = analyze_requirements(text)
    if requirements is None:
        return None
    requested = requirements.features
    if any(feature not in _CATEGORIES for feature in requested):
        return None
    ordered: list[str] = []
    def visit(feature: str) -> None:
        if feature in ordered:
            return
        for dependency in _DEPENDENCIES.get(feature, ()):
            visit(dependency)
        ordered.append(feature)
    for feature in requested:
        visit(feature)
    return FeaturePlan(
        requirements.platform, requested,
        tuple((feature, _CATEGORIES[feature]) for feature in requested),
        tuple(feature for feature in ordered if feature not in requested),
        tuple(ordered),
        tuple(pair for pair in _CONFLICTS if all(feature in requested for feature in pair)),
    )
