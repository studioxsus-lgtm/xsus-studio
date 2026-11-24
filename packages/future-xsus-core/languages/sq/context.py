"""Session-local context for supported semantic frames; no implicit execution."""
from dataclasses import dataclass
from .semantics import SemanticFrame, analyze_semantics

@dataclass(frozen=True, slots=True)
class Context:
    target: str | None = None
    age: int = 0

@dataclass(frozen=True, slots=True)
class ContextResult:
    frames: tuple[SemanticFrame, ...]
    context: Context
    candidate_target: str | None = None

def analyze_turn(text: str, context: Context = Context()) -> ContextResult:
    """Expose a prior target as a candidate, never as a resolved instruction."""
    if not isinstance(context, Context):
        raise TypeError("Expected Context")
    frames = analyze_semantics(text)
    previous = Context(context.target, context.age + 1) if context.target and context.age < 2 else Context()
    if not frames:
        return ContextResult((), previous)
    if any(f.negated or f.interrogative for f in frames):
        return ContextResult(frames, previous)
    targets = {f.target for f in frames if f.target is not None}
    if len(targets) > 1:
        return ContextResult(frames, Context())
    if len(targets) == 1:
        return ContextResult(frames, Context(next(iter(targets))))
    candidate = previous.target if len(frames) == 1 else None
    return ContextResult(frames, previous, candidate)
