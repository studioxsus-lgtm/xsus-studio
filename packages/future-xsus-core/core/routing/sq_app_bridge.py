"""Versioned XSUS App bridge for Albanian analysis, without app generation."""
from dataclasses import asdict
from core.contracts.common import LanguageTag
from core.routing.sq_analysis_contract import analyze_albanian

def analyze_app_prompt(text: str) -> dict:
    if not isinstance(text, str) or not text.strip() or len(text) > 4096:
        raise ValueError("Expected 1–4096 characters of nonblank text")
    text.encode("utf-8")
    result = analyze_albanian(text, language=LanguageTag("sq"))
    return {
        "schema_version": "1.0",
        "language": "sq",
        "operation": "prompt_analysis",
        "analysis": asdict(result.analysis),
        "quality": asdict(result.quality),
        "generation_supported": False,
        "persisted": False,
    }
