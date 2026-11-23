"""Phase 15: typed read-only Albanian analysis bridge.

This adapter does not impersonate EngineResponse: the existing V1 contract
does not define an analysis operation. It preserves the existing conversation
engine and returns a separate typed result until an analysis contract is added.
"""
from dataclasses import dataclass
from core.contracts.common import LanguageTag
from core.routing.sq_analysis_dispatch import dispatch_analysis
from languages.sq.pipeline import TextAnalysis
from languages.sq.quality import QualityReport, evaluate_text

@dataclass(frozen=True, slots=True)
class AlbanianAnalysisResponse:
    language: LanguageTag
    analysis: TextAnalysis
    quality: QualityReport

def analyze_albanian(text: str, *, language: LanguageTag) -> AlbanianAnalysisResponse:
    """Explicit opt-in analysis; only exact 'sq' is enabled."""
    if not isinstance(language, LanguageTag):
        raise TypeError("language must be a LanguageTag")
    if language.value != "sq":
        raise ValueError("Only the exact 'sq' language tag is enabled")
    result = dispatch_analysis(text, language=language.value)
    return AlbanianAnalysisResponse(
        language=language,
        analysis=result.analysis,
        quality=evaluate_text(text),
    )
