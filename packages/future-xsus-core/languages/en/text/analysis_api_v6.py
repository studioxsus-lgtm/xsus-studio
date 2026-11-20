"""Stable opt-in dictionary boundary for V6 written-English diagnostics.

No generation, execution, model promotion or external I/O is performed.
"""
from dataclasses import asdict
from .pipeline_v6 import analyze_request
from .clarification_v6 import assess_clarification
from .structure_v6 import analyze_structure

def analyze_text_v6(text: str, history: list[str] | tuple[str, ...] = ()) -> dict:
    if not isinstance(history, (list, tuple)):
        raise ValueError("history must be a list or tuple")
    result = analyze_request(text, history)
    clarification = assess_clarification(text, history)
    structure = analyze_structure(text)
    return {
        "contract_version": "6.0.0-experimental",
        "language": "en",
        "semantic": asdict(result.semantic),
        "intent": asdict(result.intent),
        "context": asdict(result.context),
        "clarification": asdict(clarification),
        "structure": asdict(structure),
        "capabilities": {
            "generates_response": False,
            "verifies_facts": False,
            "resolves_entities": False,
            "executes_actions": False,
        },
    }
