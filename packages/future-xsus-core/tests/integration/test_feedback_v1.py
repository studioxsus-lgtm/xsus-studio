"""Feedback generation, owner isolation, idempotency and human review."""
import unittest
from dataclasses import replace
from core.intelligence.feedback_v1 import AdaptiveFeedbackBridge
from core.intelligence.evaluation_v1 import EvaluationCase, IntelligenceEvaluator
from core.intelligence.unified_pipeline_v1 import PipelineRequest


class FeedbackTests(unittest.TestCase):
    def setUp(self):
        self.bridge = AdaptiveFeedbackBridge()
        self.case = EvaluationCase("wrong_case",
                                   PipelineRequest("r1", "reason",
                                                   {"query": "ready", "facts": (), "rules": ()}),
                                   "resolved", "ready", True)
        self.report = IntelligenceEvaluator().evaluate((self.case,))

    def test_failed_case_produces_pending_proposal(self):
        result = self.bridge.propose_from_report("alice", (self.case,), self.report,
                                                 {"wrong_case": "Require verified evidence"})
        self.assertEqual(len(result.proposals), 1)
        self.assertEqual(result.proposals[0].status, "pending")

    def test_duplicate_feedback_idempotent(self):
        first = self.bridge.propose_from_report("alice", (self.case,), self.report,
                                                {"wrong_case": "Require evidence"})
        second = self.bridge.propose_from_report("alice", (self.case,), self.report,
                                                 {"wrong_case": "Require evidence"})
        self.assertEqual(first.proposals[0].proposal_id, second.proposals[0].proposal_id)

    def test_owner_isolation(self):
        a = self.bridge.propose_from_report("alice", (self.case,), self.report,
                                            {"wrong_case": "Require evidence"})
        b = self.bridge.propose_from_report("bob", (self.case,), self.report,
                                            {"wrong_case": "Require evidence"})
        self.assertNotEqual(a.proposals[0].proposal_id, b.proposals[0].proposal_id)
        self.assertIsNone(self.bridge.ledger.get("bob", a.proposals[0].proposal_id))

    def test_approval_is_for_evaluation_only(self):
        result = self.bridge.propose_from_report("alice", (self.case,), self.report,
                                                 {"wrong_case": "Require evidence"})
        proposal = result.proposals[0]
        reviewed = self.bridge.review("alice", proposal.proposal_id,
                                      reviewer_id="reviewer", approve=True,
                                      expected_revision=0, note="Investigate")
        self.assertEqual(reviewed.status, "approved_for_evaluation")

    def test_stale_review_rejected(self):
        result = self.bridge.propose_from_report("alice", (self.case,), self.report,
                                                 {"wrong_case": "Require evidence"})
        proposal = result.proposals[0]
        with self.assertRaises(ValueError):
            self.bridge.review("alice", proposal.proposal_id,
                               reviewer_id="reviewer", approve=True,
                               expected_revision=1, note="Stale")

    def test_missing_correction_skipped(self):
        result = self.bridge.propose_from_report("alice", (self.case,), self.report, {})
        self.assertEqual(result.proposals, ())
        self.assertEqual(result.skipped_case_ids, ("wrong_case",))

    def test_correction_for_passed_case_rejected(self):
        passing = replace(self.case, expected_status="abstained",
                          expected_answer=None, expected_verified=False)
        report = IntelligenceEvaluator().evaluate((passing,))
        with self.assertRaises(ValueError):
            self.bridge.propose_from_report("alice", (passing,), report,
                                            {"wrong_case": "No change"})

    def test_mismatched_report_rejected(self):
        with self.assertRaises(ValueError):
            self.bridge.propose_from_report("alice", (), self.report, {})


if __name__ == "__main__":
    unittest.main()
