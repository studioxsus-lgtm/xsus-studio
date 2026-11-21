"""Candidate improvement evaluation without automatic deployment."""
import unittest
from dataclasses import replace
from core.intelligence.improvement_v1 import ControlledImprovementValidator
from core.intelligence.learning_v1 import LearningLedger
from core.intelligence.evaluation_v1 import EvaluationCase
from core.intelligence.unified_pipeline_v1 import PipelineRequest, UnifiedIntelligencePipeline


class ModifiedPipeline:
    def __init__(self, changes):
        self.base = UnifiedIntelligencePipeline()
        self.changes = changes

    def run(self, request):
        response = self.base.run(request)
        return replace(response, **self.changes.get(request.request_id, {}))


class ImprovementTests(unittest.TestCase):
    def setUp(self):
        self.ledger = LearningLedger()
        self.proposal = self.ledger.propose("alice", "old", "new", "testcase")
        self.validator = ControlledImprovementValidator(self.ledger)
        self.cases = (
            EvaluationCase("broken", PipelineRequest(
                "r1", "reason", {"query": "a", "facts": (), "rules": ()}),
                "resolved", "a", True),
            EvaluationCase("stable", PipelineRequest(
                "r2", "reason", {"query": "b", "facts": ("b",), "rules": ()}),
                "resolved", "b", True),
        )
        self.baseline = ModifiedPipeline({})
        self.candidate = ModifiedPipeline({"r1": {"status": "resolved", "answer": "a", "verified": True}})

    def approve(self):
        self.ledger.review("alice", self.proposal.proposal_id,
                           reviewer_id="reviewer", approve=True,
                           expected_revision=0, note="Evaluate candidate")

    def validate(self, candidate=None):
        return self.validator.validate(owner_id="alice", proposal_id=self.proposal.proposal_id,
                                       cases=self.cases, baseline_pipeline=self.baseline,
                                       candidate_pipeline=candidate or self.candidate)

    def test_pending_proposal_blocked(self):
        with self.assertRaises(ValueError):
            self.validate()

    def test_fixed_case_without_regression_eligible(self):
        self.approve()
        result = self.validate()
        self.assertEqual(result.status, "eligible_for_manual_review")
        self.assertEqual(result.fixed_cases, ("broken",))
        self.assertEqual(result.regressions, ())

    def test_regression_blocks_candidate(self):
        self.approve()
        candidate = ModifiedPipeline({
            "r1": {"status": "resolved", "answer": "a", "verified": True},
            "r2": {"status": "abstained", "answer": None, "verified": False},
        })
        result = self.validate(candidate)
        self.assertEqual(result.status, "blocked")
        self.assertEqual(result.regressions, ("stable",))

    def test_no_improvement_is_insufficient(self):
        self.approve()
        result = self.validate(ModifiedPipeline({}))
        self.assertEqual(result.status, "insufficient_improvement")

    def test_other_owner_cannot_validate(self):
        self.approve()
        with self.assertRaises(LookupError):
            self.validator.validate(owner_id="bob", proposal_id=self.proposal.proposal_id,
                                    cases=self.cases, baseline_pipeline=self.baseline,
                                    candidate_pipeline=self.candidate)

    def test_same_pipeline_rejected(self):
        self.approve()
        with self.assertRaises(ValueError):
            self.validator.validate(owner_id="alice", proposal_id=self.proposal.proposal_id,
                                    cases=self.cases, baseline_pipeline=self.baseline,
                                    candidate_pipeline=self.baseline)

    def test_rejected_proposal_blocked(self):
        other = self.ledger.propose("alice", "observation", "correction", "source")
        self.ledger.review("alice", other.proposal_id, reviewer_id="reviewer",
                           approve=False, expected_revision=0, note="Reject")
        with self.assertRaises(ValueError):
            self.validator.validate(owner_id="alice", proposal_id=other.proposal_id,
                                    cases=self.cases, baseline_pipeline=self.baseline,
                                    candidate_pipeline=self.candidate)

    def test_never_promotes_automatically(self):
        self.approve()
        result = self.validate()
        self.assertIn("no_automatic_promotion", result.limitations)
        self.assertEqual(self.ledger.get("alice", self.proposal.proposal_id).status,
                         "approved_for_evaluation")


if __name__ == "__main__":
    unittest.main()
