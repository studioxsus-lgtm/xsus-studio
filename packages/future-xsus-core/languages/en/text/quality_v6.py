"""Transparent response checks; heuristics are not factual verification."""
from dataclasses import dataclass
from .semantic_signals import analyze_semantic_signals

@dataclass(frozen=True, slots=True)
class ResponseQuality:
    accepted: bool
    warnings: tuple[str, ...]
    token_count: int

def check_response_quality(response: str, *, max_tokens: int = 2000) -> ResponseQuality:
    if not isinstance(max_tokens, int) or isinstance(max_tokens, bool) or not 1 <= max_tokens <= 100000:
        raise ValueError("max_tokens must be an integer between 1 and 100000")
    signals = analyze_semantic_signals(response)
    warnings = []
    if not signals.tokens:
        warnings.append("no_english_words")
    if len(signals.tokens) > max_tokens:
        warnings.append("token_limit_exceeded")
    if response != response.strip():
        warnings.append("surrounding_whitespace")
    return ResponseQuality(not warnings, tuple(warnings), len(signals.tokens))
