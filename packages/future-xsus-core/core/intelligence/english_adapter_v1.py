"""Opt-in adapter to the existing Future XSUS English analyzers."""
from languages.en.text.understanding.advanced_grammar_v1 import advanced_grammar_dict
from languages.en.text.understanding.grammar_patterns_v1 import grammar_pattern_dict


def analyze_english(text: str) -> dict:
    """Try independent parsers without overwriting their public contracts."""
    for parser in (advanced_grammar_dict, grammar_pattern_dict):
        result = parser(text)
        if result.get("status") == "resolved":
            return result
    return {"status": "abstained", "kind": None,
            "production_authorized": False}


def create_english_kernel():
    from .kernel_v1 import IntelligenceKernel
    return IntelligenceKernel(language=analyze_english)
