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


def analyze_app_prompt_v2(text: str) -> dict:
    """Opt-in analysis contract; downstream authorization remains mandatory."""
    from languages.sq.semantics import analyze_semantics
    from languages.sq.technical_requests import analyze_technical_request
    from languages.sq.spelling import check_word
    result = analyze_app_prompt(text)
    request = analyze_technical_request(text)
    result.update({
        "schema_version": "2.0",
        "semantic_frames": [asdict(frame) for frame in analyze_semantics(text)],
        "technical_request": asdict(request) if request is not None else None,
        "interpretation_status": "recognized" if request is not None else "unresolved",
        "execution_authorized": False,
        "spelling_suggestions": [
            asdict(check) for token in text.split()
            if (check := check_word(token)).status == "suggestion"
        ],
    })
    return result
