"""Review-gated candidate improvement validation without auto-promotion.

The candidate pipeline is supplied by a trusted caller; evaluation results
only authorize a recommendation, never model modification or deployment.
"""
from dataclasses import dataclass
from .evaluation_v1 import EvaluationCase, IntelligenceEvaluator
from .learning_v1 import LearningLedger
from .knowledge_v1 import _id


@dataclass(frozen=True, slots=True)
class ImprovementVerdict:
    status: str
    proposal_id: str
    baseline_passed: int
    candidate_passed: int
    total: int
    regressions: tuple[str, ...]
    fixed_cases: tuple[str, ...]
    limitations: tuple[str, ...]


class ControlledImprovementValidator:
    def __init__(self, ledger: LearningLedger):
        if not isinstance(ledger, LearningLedger):
            raise ValueError("learning ledger required")
        self.ledger = ledger

    def validate(self, *, owner_id: str, proposal_id: str,
                 cases: tuple[EvaluationCase, ...], baseline_pipeline,
                 candidate_pipeline) -> ImprovementVerdict:
        owner_id = _id(owner_id)
        proposal = self.ledger.get(owner_id, proposal_id)
        if proposal is None:
            raise LookupError("proposal not found")
        if proposal.status != "approved_for_evaluation":
            raise ValueError("proposal must be approved for evaluation")
        if baseline_pipeline is candidate_pipeline:
            raise ValueError("candidate must be a distinct pipeline")
        baseline = IntelligenceEvaluator(baseline_pipeline).evaluate(cases)
        candidate = IntelligenceEvaluator(candidate_pipeline).evaluate(cases)
        regressions = IntelligenceEvaluator.regression(candidate, baseline)
        previous = {item.case_id: item for item in baseline.outcomes}
        fixed = tuple(sorted(item.case_id for item in candidate.outcomes
                             if item.passed and not previous[item.case_id].passed))
        if "case_set_changed" in regressions:
            status = "blocked"
        elif regressions:
            status = "blocked"
        elif not fixed:
            status = "insufficient_improvement"
        else:
            status = "eligible_for_manual_review"
        return ImprovementVerdict(status, proposal_id, baseline.passed,
                                  candidate.passed, len(cases), regressions, fixed,
                                  ("no_automatic_promotion",
                                   "authored_test_cases_only",
                                   "manual_security_and_quality_review_required",
                                   "no_external_truth_validation"))
