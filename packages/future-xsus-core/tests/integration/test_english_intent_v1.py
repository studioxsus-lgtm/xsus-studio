"""Bounded English intent recognition and conversational integration."""
import unittest
from core.intelligence.english_intent_v1 import parse_english_intent
from core.intelligence.conversation_router_v1 import ConversationRouter
from core.intelligence.reasoning_v1 import Rule


class EnglishIntentTests(unittest.TestCase):
    def test_canonical_prove(self):
        self.assertEqual(parse_english_intent("prove ready").atom, "ready")

    def test_polite_prove(self):
        result = parse_english_intent("Can you prove READY?")
        self.assertEqual((result.status, result.kind, result.atom),
                         ("resolved", "prove", "ready"))

    def test_provability_question(self):
        self.assertEqual(parse_english_intent("Is ready provable?").atom, "ready")

    def test_history(self):
        self.assertEqual(parse_english_intent("How many exchanges?").kind, "history")

    def test_unsupported_abstains(self):
        self.assertEqual(parse_english_intent("Tell me a story").status, "abstained")

    def test_ambiguous_abstains(self):
        self.assertEqual(parse_english_intent("prove ready and done").status, "abstained")

    def test_invalid_atom_abstains(self):
        self.assertEqual(parse_english_intent("prove INVALID-NAME").status, "abstained")

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            parse_english_intent("  ")

    def test_overlong_rejected(self):
        with self.assertRaises(ValueError):
            parse_english_intent("a" * 2001)

    def test_router_polite_proof(self):
        router = ConversationRouter()
        session = router.create("alice")
        reply = router.reply("alice", session.session_id, expected_revision=0,
                             text="Can you prove ready?", facts=("start",),
                             rules=(Rule(("start",), "ready"),))
        self.assertEqual((reply.status, reply.answer), ("resolved", "ready"))

    def test_router_history_question(self):
        router = ConversationRouter()
        session = router.create("alice")
        reply = router.reply("alice", session.session_id, expected_revision=0,
                             text="How many exchanges?")
        self.assertEqual(reply.answer, "exchanges:0")


if __name__ == "__main__":
    unittest.main()
