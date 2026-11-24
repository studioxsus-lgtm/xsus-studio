"""Deterministic technical intent evaluation, separate from training rules."""
from dataclasses import dataclass
from .technical_requests import TechnicalRequest, analyze_technical_request

@dataclass(frozen=True, slots=True)
class EvaluationCase:
    text: str
    expected: TechnicalRequest | None

@dataclass(frozen=True, slots=True)
class EvaluationReport:
    total: int
    correct: int
    false_accepts: int
    false_rejects: int
    wrong_intents: int

    @property
    def accuracy(self) -> float | None:
        return self.correct / self.total if self.total else None

def evaluate(cases: tuple[EvaluationCase, ...]) -> EvaluationReport:
    correct = false_accepts = false_rejects = wrong_intents = 0
    for case in cases:
        actual = analyze_technical_request(case.text)
        if actual == case.expected:
            correct += 1
        elif case.expected is None:
            false_accepts += 1
        elif actual is None:
            false_rejects += 1
        else:
            wrong_intents += 1
    return EvaluationReport(len(cases), correct, false_accepts, false_rejects, wrong_intents)
