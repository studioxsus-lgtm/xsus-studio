"""Opt-in language analysis dispatcher for Future XSUS Core.

Keeps existing engine routing untouched. Does not infer unsupported languages.
"""
from dataclasses import dataclass
from languages.sq.pipeline import TextAnalysis, analyze_text

SUPPORTED_ANALYSIS_LANGUAGES = frozenset({"sq"})

@dataclass(frozen=True, slots=True)
class DispatchResult:
    requested_language: str
    analysis: TextAnalysis

class UnsupportedAnalysisLanguage(ValueError):
    pass

def dispatch_analysis(text: str, *, language: str) -> DispatchResult:
    """Explicitly route written-text analysis to an available language engine."""
    if not isinstance(text, str):
        raise TypeError("text must be a string")
    if not isinstance(language, str):
        raise TypeError("language must be a string")
    code = language.strip().casefold()
    if code not in SUPPORTED_ANALYSIS_LANGUAGES:
        raise UnsupportedAnalysisLanguage(
            f"No written-text analysis adapter registered for {code!r}"
        )
    return DispatchResult(requested_language=code, analysis=analyze_text(text))
