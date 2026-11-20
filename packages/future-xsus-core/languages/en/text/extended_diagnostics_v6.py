"""Opt-in combined English diagnostics; no modification of existing V6 API."""
from dataclasses import asdict
from .analysis_api_v6 import analyze_text_v6
from .discourse_v6 import analyze_discourse_v6
from .argument_signals_v6 import analyze_argument_signals_v6
from .reference_signals_v6 import analyze_reference_signals_v6
from .ambiguity_signals_v6 import analyze_ambiguity_signals_v6


def analyze_extended_v6(text: str, history: list[str] | tuple[str, ...] = ()) -> dict:
    """Return existing diagnostics plus isolated surface-level signals.

    The legacy analyze_text_v6 result is preserved under 'base'; this
    function never claims semantic entailment or coreference resolution.
    """
    base = analyze_text_v6(text, history)
    return {
        "contract_version": "6.0.0-experimental-extended",
        "language": "en",
        "base": base,
        "discourse": asdict(analyze_discourse_v6(text)),
        "argument_signals": asdict(analyze_argument_signals_v6(text)),
        "reference_signals": asdict(analyze_reference_signals_v6(text)),
        "ambiguity_signals": asdict(analyze_ambiguity_signals_v6(text)),
        "capabilities": {
            "resolves_references": False,
            "verifies_arguments": False,
            "verifies_facts": False,
            "generates_response": False,
            "executes_actions": False,
        },
    }
