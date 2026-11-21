"""Knowledge conflict triage, human review, and non-promotion."""
import unittest
from core.intelligence.knowledge_v1 import Evidence, KnowledgeRecord, KnowledgeStore
from core.intelligence.learning_v1 import LearningLedger
from core.intelligence.knowledge_learning_v1 import KnowledgeLearningCoordinator


def record(owner, value, source):
    return KnowledgeRecord("claim", value, Evidence.from_excerpt(source, value), owner)


class KnowledgeLearningTests(unittest.TestCase):
    def setUp(self):
        self.store = KnowledgeStore((
            record("alice", "true", "source_a"),
            record("alice", "false", "source_b"),
            record("bob", "true", "source_c"),
        ))
        self.ledger = LearningLedger()
        self.bridge = KnowledgeLearningCoordinator(self.store, self.ledger)

    def test_conflict_detected(self):
        self.assertEqual(self.bridge.assess("alice", "claim").status, "conflict")

    def test_owner_isolation(self):
        self.assertEqual(self.bridge.assess("bob", "claim").status, "supported")
        self.assertEqual(self.bridge.assess("eve", "claim").status, "unknown")

    def test_conflict_proposal_pending(self):
        result = self.bridge.propose_conflict_review("alice", "claim", "true", "source_a")
        self.assertEqual(result.status, "pending_review")
        self.assertEqual(result.proposal.status, "pending")

    def test_proposal_deduplication(self):
        a = self.bridge.propose_conflict_review("alice", "claim", "true", "source_a")
        b = self.bridge.propose_conflict_review("alice", "claim", "true", "source_a")
        self.assertEqual(a.proposal.proposal_id, b.proposal.proposal_id)

    def test_unknown_source_rejected(self):
        with self.assertRaises(ValueError):
            self.bridge.propose_conflict_review("alice", "claim", "true", "source_x")

    def test_nonconflict_rejected(self):
        with self.assertRaises(ValueError):
            self.bridge.propose_conflict_review("bob", "claim", "true", "source_c")

    def test_review_does_not_change_knowledge(self):
        proposal = self.bridge.propose_conflict_review(
            "alice", "claim", "true", "source_a").proposal
        self.bridge.review("alice", proposal.proposal_id, reviewer_id="reviewer",
                           approve=True, expected_revision=0, note="evaluate")
        self.assertEqual(self.store.query("alice", "claim").status, "conflict")

    def test_unreviewed_candidate_rejected(self):
        proposal = self.bridge.propose_conflict_review(
            "alice", "claim", "true", "source_a").proposal
        with self.assertRaises(ValueError):
            self.bridge.candidate_record("alice", proposal.proposal_id,
                                         record("alice", "true", "source_a"))

    def test_approved_candidate_requires_matching_evidence(self):
        proposal = self.bridge.propose_conflict_review(
            "alice", "claim", "true", "source_a").proposal
        self.bridge.review("alice", proposal.proposal_id, reviewer_id="reviewer",
                           approve=True, expected_revision=0, note="evaluate")
        candidate = record("alice", "true", "source_a")
        self.assertEqual(self.bridge.candidate_record(
            "alice", proposal.proposal_id, candidate), candidate)
        with self.assertRaises(ValueError):
            self.bridge.candidate_record(
                "alice", proposal.proposal_id, record("alice", "false", "source_b"))

    def test_cross_owner_candidate_rejected(self):
        proposal = self.bridge.propose_conflict_review(
            "alice", "claim", "true", "source_a").proposal
        self.bridge.review("alice", proposal.proposal_id, reviewer_id="reviewer",
                           approve=True, expected_revision=0, note="evaluate")
        with self.assertRaises(ValueError):
            self.bridge.candidate_record("alice", proposal.proposal_id,
                                         record("bob", "true", "source_a"))


if __name__ == "__main__":
    unittest.main()
