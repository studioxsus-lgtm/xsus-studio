"""Learning review and existing conversation-memory integration."""
import unittest
from core.sessions.session_store import InMemorySessionStore, SessionNotFoundError
from core.intelligence.learning_v1 import LearningLedger
from core.intelligence.memory_learning_v1 import MemoryLearningBridge


class MemoryLearningTests(unittest.TestCase):
    def setUp(self):
        self.sessions = InMemorySessionStore()
        self.ledger = LearningLedger()
        self.bridge = MemoryLearningBridge(self.sessions, self.ledger)
        self.session = self.sessions.create("alice")
        self.sessions.append_exchange("alice", self.session.session_id,
                                      expected_revision=0, user_text="What is 2+2?",
                                      assistant_text="It is five.")

    def test_context_reads_real_session(self):
        result = self.bridge.context("alice", self.session.session_id)
        self.assertEqual(result.revision, 1)
        self.assertEqual(result.turns[-1], ("assistant", "It is five."))

    def test_owner_isolation(self):
        with self.assertRaises(SessionNotFoundError):
            self.bridge.context("bob", self.session.session_id)
        with self.assertRaises(SessionNotFoundError):
            self.bridge.propose_from_correction(
                "bob", self.session.session_id, "It is four.", expected_revision=1)

    def test_learning_proposal_not_training(self):
        proposal = self.bridge.propose_from_correction(
            "alice", self.session.session_id, "It is four.", expected_revision=1)
        self.assertEqual(proposal.status, "pending")
        self.assertEqual(proposal.observation, "It is five.")
        self.assertEqual(proposal.correction, "It is four.")
        self.assertEqual(self.bridge.context("alice", self.session.session_id).revision, 1)

    def test_stale_session_rejected(self):
        with self.assertRaises(ValueError):
            self.bridge.propose_from_correction(
                "alice", self.session.session_id, "It is four.", expected_revision=0)

    def test_duplicate_proposal_is_idempotent(self):
        a = self.bridge.propose_from_correction(
            "alice", self.session.session_id, "It is four.", expected_revision=1)
        b = self.bridge.propose_from_correction(
            "alice", self.session.session_id, "It is four.", expected_revision=1)
        self.assertEqual(a, b)
        self.assertEqual(len(self.ledger.list_for_owner("alice")), 1)

    def test_review_approval_is_not_promotion(self):
        proposal = self.bridge.propose_from_correction(
            "alice", self.session.session_id, "It is four.", expected_revision=1)
        reviewed = self.ledger.review(
            "alice", proposal.proposal_id, reviewer_id="reviewer",
            approve=True, expected_revision=0, note="requires benchmark")
        self.assertEqual(reviewed.status, "approved_for_evaluation")
        self.assertEqual(reviewed.revision, 1)
        self.assertEqual(self.bridge.context("alice", self.session.session_id).revision, 1)

    def test_review_reject(self):
        proposal = self.bridge.propose_from_correction(
            "alice", self.session.session_id, "It is four.", expected_revision=1)
        reviewed = self.ledger.review(
            "alice", proposal.proposal_id, reviewer_id="reviewer",
            approve=False, expected_revision=0, note="unverified correction")
        self.assertEqual(reviewed.status, "rejected")

    def test_review_revision_and_repeat_rejected(self):
        proposal = self.bridge.propose_from_correction(
            "alice", self.session.session_id, "It is four.", expected_revision=1)
        with self.assertRaises(ValueError):
            self.ledger.review("alice", proposal.proposal_id, reviewer_id="reviewer",
                               approve=True, expected_revision=1, note="stale")
        self.ledger.review("alice", proposal.proposal_id, reviewer_id="reviewer",
                           approve=True, expected_revision=0, note="ok")
        with self.assertRaises(ValueError):
            self.ledger.review("alice", proposal.proposal_id, reviewer_id="reviewer",
                               approve=True, expected_revision=1, note="duplicate")

    def test_reviewer_owner_scope(self):
        proposal = self.bridge.propose_from_correction(
            "alice", self.session.session_id, "It is four.", expected_revision=1)
        self.assertIsNone(self.ledger.get("bob", proposal.proposal_id))
        with self.assertRaises(LookupError):
            self.ledger.review("bob", proposal.proposal_id, reviewer_id="reviewer",
                               approve=True, expected_revision=0, note="not yours")

    def test_bounded_history(self):
        with self.assertRaises(ValueError):
            self.bridge.context("alice", self.session.session_id, max_turns=100)


if __name__ == "__main__":
    unittest.main()
