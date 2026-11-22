import unittest
from dataclasses import replace
from core.intelligence.holdout_learning_v1 import HoldoutLearningGate
from core.intelligence.learning_v1 import LearningLedger
from core.intelligence.evaluation_v1 import EvaluationCase
from core.intelligence.unified_pipeline_v1 import PipelineRequest, UnifiedIntelligencePipeline


class Candidate:
    def __init__(self, changes):
        self.changes = changes
        self.base = UnifiedIntelligencePipeline()

    def run(self, request):
        return replace(self.base.run(request), **self.changes.get(request.request_id, {}))


class HoldoutLearningTests(unittest.TestCase):
    def setUp(self):
        self.ledger = LearningLedger()
        self.proposal = self.ledger.propose("alice", "old", "new", "source")
        self.gate = HoldoutLearningGate(self.ledger)
        self.dev = (EvaluationCase("dev", PipelineRequest(
            "r1", "reason", {"query": "a", "facts": (), "rules": ()}),
            "resolved", "a", True),)
        self.hold = (EvaluationCase("hold", PipelineRequest(
            "r2", "reason", {"query": "b", "facts": ("b",), "rules": ()}),
            "resolved", "b", True),)
        self.fix = {"r1": {"status": "resolved", "answer": "a", "verified": True}}

    def approve(self):
        self.ledger.review("alice", self.proposal.proposal_id,
                           reviewer_id="reviewer", approve=True,
                           expected_revision=0, note="Evaluate")

    def run_gate(self, changes=None, hold=None):
        return self.gate.evaluate(owner_id="alice", proposal_id=self.proposal.proposal_id,
            development=self.dev, holdout=self.hold if hold is None else hold,
            baseline_pipeline=Candidate({}), candidate_pipeline=Candidate(
                self.fix if changes is None else changes))

    def test_eligible(self):
        self.approve()
        self.assertEqual(self.run_gate().status, "eligible_for_manual_review")

    def test_pending_blocked(self):
        with self.assertRaises(ValueError):
            self.run_gate()

    def test_regression_blocked(self):
        self.approve()
        changes = dict(self.fix, r2={"status": "abstained", "answer": None, "verified": False})
        self.assertEqual(self.run_gate(changes).status, "blocked")

    def test_no_improvement(self):
        self.approve()
        self.assertEqual(self.run_gate({}).status, "insufficient_improvement")

    def test_duplicate_case_rejected(self):
        self.approve()
        with self.assertRaises(ValueError):
            self.run_gate(hold=self.dev)

    def test_duplicate_payload_rejected(self):
        self.approve()
        clone = replace(self.dev[0], case_id="different",
                        request=replace(self.dev[0].request, request_id="r3"))
        with self.assertRaises(ValueError):
            self.run_gate(hold=(clone,))

    def test_empty_holdout_rejected(self):
        self.approve()
        with self.assertRaises(ValueError):
            self.run_gate(hold=())

    def test_no_promotion(self):
        self.approve()
        self.assertIn("no_automatic_promotion", self.run_gate().limitations)
        self.assertEqual(self.ledger.get("alice", self.proposal.proposal_id).status,
                         "approved_for_evaluation")
