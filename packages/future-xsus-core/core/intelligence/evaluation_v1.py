"""Deterministic offline intelligence benchmark and regression gate.

Evaluates contract outputs against authored expected outcomes; it does not
establish open-world intelligence, external truth, or production reliability.
"""
from dataclasses import dataclass
from .knowledge_v1 import _id
from .unified_pipeline_v1 import PipelineRequest, UnifiedIntelligencePipeline

MAX_CASES = 256


@dataclass(frozen=True, slots=True)
class EvaluationCase:
    case_id: str
    request: PipelineRequest
    expected_status: str
    expected_answer: str | None
    expected_verified: bool

    def __post_init__(self):
        _id(self.case_id)
        if not isinstance(self.request, PipelineRequest):
            raise ValueError("invalid evaluation request")
        if self.expected_status not in ("resolved", "proposed", "abstained", "error"):
            raise ValueError("invalid expected status")
        if self.expected_answer is not None and not isinstance(self.expected_answer, str):
            raise ValueError("invalid expected answer")
        if type(self.expected_verified) is not bool:
            raise ValueError("invalid verification expectation")


@dataclass(frozen=True, slots=True)
class EvaluationOutcome:
    case_id: str
    passed: bool
    observed_status: str
    observed_answer: str | None
    observed_verified: bool
    failure_reasons: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class EvaluationReport:
    status: str
    passed: int
    total: int
    outcomes: tuple[EvaluationOutcome, ...]
    limitations: tuple[str, ...]


class IntelligenceEvaluator:
    def __init__(self, pipeline=None):
        self.pipeline = pipeline if pipeline is not None else UnifiedIntelligencePipeline()

    def evaluate(self, cases: tuple[EvaluationCase, ...]) -> EvaluationReport:
        if not isinstance(cases, tuple) or not 1 <= len(cases) <= MAX_CASES:
            raise ValueError("requires 1 to 256 evaluation cases")
        if any(not isinstance(case, EvaluationCase) for case in cases):
            raise ValueError("invalid evaluation case")
        if len({case.case_id for case in cases}) != len(cases):
            raise ValueError("duplicate evaluation IDs")
        outcomes = []
        for case in cases:
            try:
                response = self.pipeline.run(case.request)
                status, answer, verified = response.status, response.answer, response.verified
                reasons = tuple(
                    name for name, mismatch in (
                        ("status_mismatch", status != case.expected_status),
                        ("answer_mismatch", answer != case.expected_answer),
                        ("verification_mismatch", verified != case.expected_verified),
                    ) if mismatch
                )
            except (ValueError, TypeError, RuntimeError, LookupError) as exc:
                status, answer, verified = "exception", None, False
                reasons = ("pipeline_exception_" + type(exc).__name__,)
            outcomes.append(EvaluationOutcome(case.case_id, not reasons, status,
                                               answer, verified, reasons))
        passed = sum(outcome.passed for outcome in outcomes)
        return EvaluationReport("pass" if passed == len(cases) else "fail",
                                passed, len(cases), tuple(outcomes),
                                ("authored_cases_only", "no_external_truth_validation",
                                 "no_production_load_measurement"))

    @staticmethod
    def regression(current: EvaluationReport, baseline: EvaluationReport) -> tuple[str, ...]:
        if not isinstance(current, EvaluationReport) or not isinstance(baseline, EvaluationReport):
            raise ValueError("invalid evaluation report")
        old = {outcome.case_id: outcome for outcome in baseline.outcomes}
        new = {outcome.case_id: outcome for outcome in current.outcomes}
        if set(old) != set(new):
            return ("case_set_changed",)
        return tuple(sorted(case_id for case_id in old
                            if old[case_id].passed and not new[case_id].passed))
