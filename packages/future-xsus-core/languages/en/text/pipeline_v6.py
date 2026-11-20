"""Opt-in V6 analysis pipeline; no changes to existing public interfaces."""
from dataclasses import dataclass
from .semantic_signals import SemanticSignals, analyze_semantic_signals
from .intent_v6 import IntentResult, classify_intent
from .context_v6 import ContextSummary, analyze_context

@dataclass(frozen=True, slots=True)
class PipelineResult:
    semantic: SemanticSignals
    intent: IntentResult
    context: ContextSummary

def analyze_request(text: str, history: list[str] | tuple[str, ...] = ()) -> PipelineResult:
    if not isinstance(history, (list, tuple)):
        raise ValueError("history must be a list or tuple")
    return PipelineResult(
        semantic=analyze_semantic_signals(text),
        intent=classify_intent(text),
        context=analyze_context((*history, text)),
    )
