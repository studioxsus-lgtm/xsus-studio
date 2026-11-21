"""Per-capability authored benchmark with strict baseline comparability.

No benchmark result here establishes open-world generalization.
"""
from dataclasses import dataclass
from .evaluation_v1 import EvaluationCase, IntelligenceEvaluator


@dataclass(frozen=True, slots=True)
class CapabilityCase:
    capability: str
    case: EvaluationCase

    def __post_init__(self):
        if self.capability not in ("reasoning", "problem_solving", "planning",
                                   "decision", "evidence", "abstention"):
            raise ValueError("unsupported capability")
        if not isinstance(self.case, EvaluationCase):
            raise ValueError("invalid benchmark case")


@dataclass(frozen=True, slots=True)
class CapabilityScore:
    capability: str
    passed: int
    total: int


@dataclass(frozen=True, slots=True)
class CapabilityBenchmarkReport:
    status: str
    scores: tuple[CapabilityScore, ...]
    passed: int
    total: int
    failed_case_ids: tuple[str, ...]
    limitations: tuple[str, ...]


class CapabilityBenchmark:
    def __init__(self, evaluator=None):
        self.evaluator = evaluator if evaluator is not None else IntelligenceEvaluator()

    def evaluate(self, cases: tuple[CapabilityCase, ...]) -> CapabilityBenchmarkReport:
        if not isinstance(cases, tuple) or not 1 <= len(cases) <= 256:
            raise ValueError("requires 1 to 256 benchmark cases")
        if any(not isinstance(item, CapabilityCase) for item in cases):
            raise ValueError("invalid benchmark case")
        ids = tuple(item.case.case_id for item in cases)
        if len(set(ids)) != len(ids):
            raise ValueError("duplicate case IDs")
        report = self.evaluator.evaluate(tuple(item.case for item in cases))
        outcomes = {outcome.case_id: outcome for outcome in report.outcomes}
        capabilities = sorted({item.capability for item in cases})
        scores = tuple(CapabilityScore(
            capability,
            sum(outcomes[item.case.case_id].passed for item in cases
                if item.capability == capability),
            sum(item.capability == capability for item in cases))
            for capability in capabilities)
        return CapabilityBenchmarkReport(
            "pass" if report.passed == report.total else "fail",
            scores, report.passed, report.total,
            tuple(sorted(outcome.case_id for outcome in report.outcomes
                         if not outcome.passed)),
            ("authored_offline_cases_only", "not_generalization_measurement",
             "no_external_truth_or_production_claim"))

    @staticmethod
    def compare(current: CapabilityBenchmarkReport,
                baseline: CapabilityBenchmarkReport) -> tuple[str, ...]:
        if not isinstance(current, CapabilityBenchmarkReport) or not isinstance(
                baseline, CapabilityBenchmarkReport):
            raise ValueError("invalid benchmark reports")
        if current.total != baseline.total or tuple(
                (s.capability, s.total) for s in current.scores) != tuple(
                (s.capability, s.total) for s in baseline.scores):
            return ("benchmark_shape_changed",)
        regressions = tuple(sorted(
            score.capability for score in current.scores
            if score.passed < next(previous.passed for previous in baseline.scores
                                   if previous.capability == score.capability)))
        return regressions
