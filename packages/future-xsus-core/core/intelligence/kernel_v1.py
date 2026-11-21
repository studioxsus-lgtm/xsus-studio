"""Future XSUS Core experimental intelligence orchestrator.

A bounded, offline composition layer. It does not claim AGI, open-domain
reasoning, autonomous model training, or authorization to execute tools.
"""
from dataclasses import asdict, dataclass
from hashlib import sha256
from typing import Callable

MAX_TEXT = 2000
MAX_STEPS = 8
MAX_HISTORY = 16


@dataclass(frozen=True, slots=True)
class IntelligenceResult:
    status: str
    task: str
    answer: str | None
    evidence: tuple[str, ...]
    steps: tuple[str, ...]
    verified: bool
    limitations: tuple[str, ...]


def _safe_text(text: str) -> str:
    if not isinstance(text, str) or not text.strip() or len(text) > MAX_TEXT:
        raise ValueError("input must be a nonempty string of at most 2000 characters")
    return text.strip()


def _result(status, task, answer=None, evidence=(), steps=(), verified=False, limitations=()):
    return IntelligenceResult(status, task, answer, tuple(evidence),
                              tuple(steps), verified, tuple(limitations))


class IntelligenceKernel:
    """Compose explicitly supplied language, knowledge and calculation capabilities.

    No network access, dynamic execution, or silent learning. New knowledge is
    proposed for review and never committed by this kernel.
    """

    def __init__(self, *, language: Callable[[str], dict] | None = None,
                 knowledge: Callable[[str], dict] | None = None):
        self._language = language
        self._knowledge = knowledge

    def analyze(self, text: str) -> IntelligenceResult:
        text = _safe_text(text)
        if self._language is None:
            return _result("abstained", "language", limitations=("language_adapter_unavailable",))
        try:
            output = self._language(text)
        except Exception:
            return _result("error", "language", limitations=("language_adapter_failed",))
        if not isinstance(output, dict) or output.get("status") != "resolved":
            return _result("abstained", "language", limitations=("language_not_resolved",))
        kind = output.get("kind")
        if not isinstance(kind, str) or not kind or len(kind) > 100:
            return _result("abstained", "language", limitations=("invalid_language_result",))
        return _result("resolved", "language", kind, ("language_adapter",),
                       ("normalize", "parse", "validate"), True,
                       ("bounded_grammar_only",))

    def reason(self, query: str, facts: tuple[str, ...], rules: tuple) -> IntelligenceResult:
        """Prove a bounded logical claim and independently replay its proof."""
        from .reasoning_v1 import ReasoningEngine, verify_proof
        engine = ReasoningEngine(facts, rules)
        proof = engine.prove(query)
        if not proof.entailed:
            return _result("abstained", "reasoning", limitations=proof.limitations)
        if not verify_proof(proof, engine.facts, engine.rules):
            return _result("error", "reasoning", limitations=("proof_verification_failed",))
        return _result("resolved", "reasoning", proof.query,
                       tuple(step.conclusion for step in proof.proof),
                       ("derive", "replay_proof"), True,
                       ("formal_inference_only", "facts_not_independently_verified"))

    def infer_from_sources(self, store, owner_id: str, keys: tuple[str, ...],
                           rules: tuple, query: str) -> IntelligenceResult:
        """Infer from owner-scoped evidence, distinguishing logic from truth."""
        from .knowledge_reasoning_v1 import infer_from_knowledge
        result = infer_from_knowledge(store, owner_id, keys, rules, query)
        if result.status != "entailed":
            return _result("abstained", "grounded_reasoning",
                           evidence=result.sources, limitations=result.limitations)
        return _result("resolved", "grounded_reasoning", result.query,
                       result.sources, ("retrieve_evidence", "derive", "replay_proof"),
                       result.verified_derivation,
                       result.limitations)

    def retrieve(self, question: str) -> IntelligenceResult:
        question = _safe_text(question)
        if self._knowledge is None:
            return _result("abstained", "knowledge", limitations=("knowledge_adapter_unavailable",))
        try:
            output = self._knowledge(question)
        except Exception:
            return _result("error", "knowledge", limitations=("knowledge_adapter_failed",))
        if not isinstance(output, dict):
            return _result("abstained", "knowledge", limitations=("invalid_knowledge_result",))
        answer, source = output.get("answer"), output.get("source")
        if not all(isinstance(x, str) and x.strip() and len(x) <= MAX_TEXT
                   for x in (answer, source)):
            return _result("abstained", "knowledge", limitations=("missing_verifiable_source",))
        return _result("resolved", "knowledge", answer, (source,),
                       ("retrieve", "check_source_presence"), False,
                       ("source_presence_is_not_truth_verification",))

    def solve_problem(self, goal: str, facts: tuple[str, ...], rules: tuple,
                      *, max_steps: int = 128) -> IntelligenceResult:
        """Find a formal multi-step solution with independently checked proof."""
        from .problem_solver_v1 import ProblemSolver
        solver = ProblemSolver(max_steps=max_steps)
        solution = solver.solve(goal, facts, rules)
        if solution.status != "solved":
            return _result("abstained", "problem_solving",
                           limitations=solution.limitations)
        if not solver.evaluate(solution, facts, rules):
            return _result("error", "problem_solving",
                           limitations=("solution_verification_failed",))
        return _result("resolved", "problem_solving", solution.goal,
                       tuple(step.conclusion for step in solution.steps),
                       ("decompose", "derive", "verify"), True,
                       solution.limitations)

    def plan(self, goal: str, steps: tuple[str, ...]) -> IntelligenceResult:
        goal = _safe_text(goal)
        if not isinstance(steps, tuple) or not 1 <= len(steps) <= MAX_STEPS:
            raise ValueError("plan must contain 1 to 8 explicit steps")
        normalized = tuple(_safe_text(step) for step in steps)
        if len(set(normalized)) != len(normalized):
            raise ValueError("duplicate plan steps")
        return _result("proposed", "planning", None, (), normalized, False,
                       ("plan_not_executed", "human_authorization_required"))

    def propose_learning(self, observation: str, correction: str) -> dict:
        observation, correction = _safe_text(observation), _safe_text(correction)
        digest = sha256((observation + "\x00" + correction).encode()).hexdigest()
        return {"status": "review_required", "proposal_id": digest,
                "training_started": False, "model_changed": False,
                "knowledge_committed": False}

    def execute(self, plan: IntelligenceResult) -> IntelligenceResult:
        if not isinstance(plan, IntelligenceResult) or plan.task != "planning":
            raise ValueError("only plans may be submitted")
        return _result("denied", "execution", None, (), plan.steps, False,
                       ("no_tool_permissions", "human_authorization_required"))


class BoundedConversation:
    """Volatile, owner-controlled dialogue store; no automatic cross-user sharing."""

    def __init__(self):
        self._turns: list[tuple[str, str]] = []

    def add(self, role: str, text: str) -> tuple[tuple[str, str], ...]:
        if role not in ("user", "assistant"):
            raise ValueError("unsupported role")
        self._turns.append((role, _safe_text(text)))
        self._turns = self._turns[-MAX_HISTORY:]
        return self.history()

    def history(self) -> tuple[tuple[str, str], ...]:
        return tuple(self._turns)

    def clear(self) -> None:
        self._turns.clear()
