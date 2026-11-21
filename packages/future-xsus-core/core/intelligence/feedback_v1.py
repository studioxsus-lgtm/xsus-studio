"""Review-gated conversion of failed evaluation cases into learning proposals.

Feedback records never alter the kernel, model parameters, or trusted knowledge.
"""
from dataclasses import dataclass
from .evaluation_v1 import EvaluationCase, EvaluationReport
from .learning_v1 import LearningLedger, LearningProposal
from .knowledge_v1 import _id, _text


@dataclass(frozen=True, slots=True)
class FeedbackResult:
    owner_id: str
    proposals: tuple[LearningProposal, ...]
    skipped_case_ids: tuple[str, ...]
    limitations: tuple[str, ...]


class AdaptiveFeedbackBridge:
    def __init__(self, ledger=None):
        self.ledger = ledger if ledger is not None else LearningLedger()

    def propose_from_report(self, owner_id: str, cases: tuple[EvaluationCase, ...],
                            report: EvaluationReport,
                            corrections: dict[str, str]) -> FeedbackResult:
        owner_id = _id(owner_id)
        if not isinstance(report, EvaluationReport) or not isinstance(cases, tuple):
            raise ValueError("invalid report or cases")
        if not isinstance(corrections, dict):
            raise ValueError("corrections must be a mapping")
        if len({c.case_id for c in cases if isinstance(c, EvaluationCase)}) != len(cases):
            raise ValueError("duplicate or invalid cases")
        by_id = {case.case_id: case for case in cases}
        outcome_ids = [outcome.case_id for outcome in report.outcomes]
        if set(outcome_ids) != set(by_id) or len(outcome_ids) != len(report.outcomes):
            raise ValueError("report and case set mismatch")
        failures = {o.case_id for o in report.outcomes if not o.passed}
        if not set(corrections).issubset(failures):
            raise ValueError("corrections must target failed cases only")
        proposals = []
        skipped = []
        for outcome in report.outcomes:
            if outcome.passed:
                continue
            correction = corrections.get(outcome.case_id)
            if correction is None:
                skipped.append(outcome.case_id)
                continue
            correction = _text(correction)
            observation = "case=" + outcome.case_id + ";status=" + outcome.observed_status + ";answer=" + repr(outcome.observed_answer)
            # Avoid exposing unbounded source text in ledger observations.
            observation = _text(observation[:512])
            if observation == correction:
                raise ValueError("correction must differ from observation")
            proposals.append(self.ledger.propose(owner_id, observation, correction,
                                                 outcome.case_id))
        return FeedbackResult(owner_id, tuple(proposals), tuple(skipped),
                              ("proposals_require_human_review",
                               "no_automatic_model_or_knowledge_updates",
                               "authored_expectations_not_external_truth"))

    def review(self, owner_id: str, proposal_id: str, *, reviewer_id: str,
               approve: bool, expected_revision: int, note: str) -> LearningProposal:
        return self.ledger.review(owner_id, proposal_id, reviewer_id=reviewer_id,
                                  approve=approve, expected_revision=expected_revision,
                                  note=note)
