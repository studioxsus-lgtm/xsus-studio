"""Conversation routing, revisions, isolation, and abstention."""
import unittest
from core.intelligence.conversation_router_v1 import ConversationRouter
from core.intelligence.reasoning_v1 import Rule
from core.sessions.session_store import SessionNotFoundError


class ConversationRouterTests(unittest.TestCase):
    def setUp(self):
        self.router = ConversationRouter()
        self.session = self.router.create("alice")

    def test_proof_answer(self):
        result = self.router.reply(
            "alice", self.session.session_id, expected_revision=0,
            text="prove ready", facts=("tested",),
            rules=(Rule(("tested",), "ready"),))
        self.assertEqual((result.status, result.answer, result.revision),
                         ("resolved", "ready", 1))

    def test_missing_proof_abstains(self):
        result = self.router.reply(
            "alice", self.session.session_id, expected_revision=0,
            text="prove ready", facts=(), rules=(Rule(("tested",), "ready"),))
        self.assertEqual(result.status, "abstained")
        self.assertIsNone(result.answer)

    def test_unsupported_intent_abstains(self):
        result = self.router.reply(
            "alice", self.session.session_id, expected_revision=0,
            text="What is the weather?")
        self.assertEqual(result.status, "abstained")

    def test_history_metadata(self):
        self.router.reply("alice", self.session.session_id,
                          expected_revision=0, text="unknown")
        result = self.router.reply("alice", self.session.session_id,
                                   expected_revision=1, text="history")
        self.assertEqual(result.answer, "exchanges:1")

    def test_stale_revision_rejected(self):
        self.router.reply("alice", self.session.session_id,
                          expected_revision=0, text="unknown")
        with self.assertRaises(ValueError):
            self.router.reply("alice", self.session.session_id,
                              expected_revision=0, text="history")

    def test_cross_owner_isolation(self):
        with self.assertRaises(SessionNotFoundError):
            self.router.reply("bob", self.session.session_id,
                              expected_revision=0, text="history")

    def test_invalid_command_fails_closed(self):
        result = self.router.reply("alice", self.session.session_id,
                                   expected_revision=0, text="prove INVALID",
                                   rules=(Rule(("a",), "b"),))
        self.assertEqual(result.status, "abstained")

    def test_no_persistent_cross_session_history(self):
        other = self.router.create("alice")
        result = self.router.reply("alice", other.session_id,
                                   expected_revision=0, text="history")
        self.assertEqual(result.answer, "exchanges:0")

    def test_limitations(self):
        result = self.router.reply("alice", self.session.session_id,
                                   expected_revision=0, text="hello")
        self.assertIn("no_autonomous_learning", result.limitations)


if __name__ == "__main__":
    unittest.main()
