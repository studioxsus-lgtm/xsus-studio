"""Two-part controlled candidate validation. No promotion or deployment."""
from dataclasses import dataclass
from .evaluation_v1 import EvaluationCase, IntelligenceEvaluator
from .improvement_v1 import ControlledImprovementValidator, ImprovementVerdict


@dataclass(frozen=True, slots=True)
class HoldoutVerdict:
    status: str
    development: ImprovementVerdict
    holdout: ImprovementVerdict
    limitations: tuple[str, ...]


class HoldoutLearningGate:
    def __init__(self, ledger):
        self.validator = ControlledImprovementValidator(ledger)

    def evaluate(self, *, owner_id, proposal_id, development, holdout,
                 baseline_pipeline, candidate_pipeline):
        for partition in (development, holdout):
            if (not isinstance(partition, tuple) or not 1 <= len(partition) <= 256
                    or any(not isinstance(c, EvaluationCase) for c in partition)):
                raise ValueError("invalid evaluation partition")
        combined = development + holdout
        if len({c.case_id for c in combined}) != len(combined):
            raise ValueError("case IDs must be disjoint")
        if len({c.request.request_id for c in combined}) != len(combined):
            raise ValueError("request IDs must be disjoint")
        for left in development:
            for right in holdout:
                if (left.request.operation == right.request.operation
                        and left.request.payload == right.request.payload):
                    raise ValueError("duplicate request across partitions")
        args = dict(owner_id=owner_id, proposal_id=proposal_id,
                    baseline_pipeline=baseline_pipeline,
                    candidate_pipeline=candidate_pipeline)
        dev = self.validator.validate(cases=development, **args)
        test = self.validator.validate(cases=holdout, **args)
        if dev.status == "blocked" or test.status == "blocked" or test.candidate_passed != test.total:
            status = "blocked"
        elif dev.status != "eligible_for_manual_review":
            status = "insufficient_improvement"
        else:
            status = "eligible_for_manual_review"
        return HoldoutVerdict(status, dev, test,
                              ("no_automatic_promotion",
                               "caller_supplied_holdout_not_independently_certified",
                               "manual_release_review_required"))
