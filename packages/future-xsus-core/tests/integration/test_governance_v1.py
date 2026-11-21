"""Governance status transitions, version guards, and owner isolation."""
import unittest
from core.intelligence.governance_v1 import CandidateGovernance
from core.intelligence.improvement_v1 import ImprovementVerdict


class GovernanceTests(unittest.TestCase):
    def setUp(self):
        self.governance = CandidateGovernance()
        self.good = ImprovementVerdict(
            "eligible_for_manual_review", "proposal1", 1, 2, 2, (),
            ("fixed",), ("no_automatic_promotion",))

    def test_register_pending(self):
        record = self.governance.register("alice", "v2", self.good)
        self.assertEqual(record.status, "pending_review")
        self.assertEqual(record.revision, 0)

    def test_approval_only_for_release_review(self):
        self.governance.register("alice", "v2", self.good)
        record = self.governance.review("alice", "v2", reviewer_id="reviewer",
                                        approve=True, expected_revision=0, note="Review")
        self.assertEqual(record.status, "approved_for_release_review")
        self.assertNotEqual(record.status, "deployed")

    def test_rejection(self):
        self.governance.register("alice", "v2", self.good)
        record = self.governance.review("alice", "v2", reviewer_id="reviewer",
                                        approve=False, expected_revision=0, note="Reject")
        self.assertEqual(record.status, "rejected")

    def test_stale_revision_rejected(self):
        self.governance.register("alice", "v2", self.good)
        with self.assertRaises(ValueError):
            self.governance.review("alice", "v2", reviewer_id="reviewer",
                                   approve=True, expected_revision=1, note="Stale")

    def test_double_review_rejected(self):
        self.governance.register("alice", "v2", self.good)
        self.governance.review("alice", "v2", reviewer_id="reviewer",
                               approve=True, expected_revision=0, note="First")
        with self.assertRaises(ValueError):
            self.governance.review("alice", "v2", reviewer_id="reviewer",
                                   approve=True, expected_revision=1, note="Again")

    def test_owner_isolation(self):
        self.governance.register("alice", "v2", self.good)
        self.assertIsNone(self.governance.get("bob", "v2"))
        with self.assertRaises(LookupError):
            self.governance.review("bob", "v2", reviewer_id="reviewer",
                                   approve=True, expected_revision=0, note="Cross-owner")

    def test_regression_verdict_rejected(self):
        bad = ImprovementVerdict("blocked", "proposal1", 2, 1, 2,
                                 ("stable",), ("fixed",), ())
        with self.assertRaises(ValueError):
            self.governance.register("alice", "v2", bad)

    def test_idempotent_registration(self):
        first = self.governance.register("alice", "v2", self.good)
        second = self.governance.register("alice", "v2", self.good)
        self.assertEqual(first, second)

    def test_candidate_rebinding_rejected(self):
        self.governance.register("alice", "v2", self.good)
        other = ImprovementVerdict("eligible_for_manual_review", "proposal2",
                                   1, 2, 2, (), ("fixed",), ())
        with self.assertRaises(ValueError):
            self.governance.register("alice", "v2", other)


if __name__ == "__main__":
    unittest.main()
