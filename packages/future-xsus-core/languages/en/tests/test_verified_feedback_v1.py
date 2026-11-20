import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from languages.en.data.preparation.corpus import parse_example
from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.learning.verified_feedback_v1 import (
    VerifiedFeedbackRequestV1, verify_approved_language_feedback_v1,
)


class VerifiedFeedbackV1Tests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.store = SQLiteFeedbackStore(Path(self.temp.name) / "feedback.db")

    def add(self, owner="alice", approved=None, prompt="Check the sentence."):
        record = self.store.submit(owner, parse_example({
            "prompt": prompt, "history": [], "response": "The sentence is correct."
        }), consent=True)
        if approved is not None:
            self.store.review(owner, record.example_id, approved=approved)
        return record.example_id

    def check(self, ids, owner="alice", domain="grammar"):
        return verify_approved_language_feedback_v1(
            self.store, VerifiedFeedbackRequestV1(owner, tuple(ids), domain)
        )

    def test_accepted_passes(self):
        self.assertTrue(self.check([self.add(approved=True)])["approved_from_persistent_store"])

    def test_pending_rejected(self):
        with self.assertRaisesRegex(ValueError, "not approved"):
            self.check([self.add()])

    def test_rejected_rejected(self):
        with self.assertRaisesRegex(ValueError, "not approved"):
            self.check([self.add(approved=False)])

    def test_cross_owner_denied(self):
        with self.assertRaises(KeyError):
            self.check([self.add(owner="alice", approved=True)], owner="bob")

    def test_missing_id_denied(self):
        with self.assertRaises(KeyError):
            self.check(["0" * 64])

    def test_duplicate_ids_denied(self):
        item = self.add(approved=True)
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            self.check([item, item])

    def test_empty_ids_denied(self):
        with self.assertRaises(ValueError):
            self.check([])

    def test_invalid_domain_denied(self):
        with self.assertRaisesRegex(ValueError, "scope rejected"):
            self.check([self.add(approved=True)], domain="programming")

    def test_general_knowledge_denied(self):
        with self.assertRaises(ValueError):
            self.check([self.add(approved=True)], domain="general_knowledge")

    def test_invalid_store_denied(self):
        with self.assertRaises(ValueError):
            verify_approved_language_feedback_v1(None, VerifiedFeedbackRequestV1("alice", ("x",), "grammar"))

    def test_invalid_request_denied(self):
        with self.assertRaises(ValueError):
            verify_approved_language_feedback_v1(self.store, None)

    def test_empty_owner_denied(self):
        with self.assertRaises(ValueError):
            self.check([self.add(approved=True)], owner="")

    def test_non_string_id_denied(self):
        with self.assertRaises(ValueError):
            self.check([12])

    def test_non_tuple_ids_denied(self):
        with self.assertRaises(ValueError):
            verify_approved_language_feedback_v1(
                self.store, VerifiedFeedbackRequestV1("alice", [self.add(approved=True)], "grammar")
            )

    def test_no_training_started(self):
        self.assertFalse(self.check([self.add(approved=True)])["training_started"])

    def test_no_production_authorization(self):
        self.assertFalse(self.check([self.add(approved=True)])["production_activation_authorized"])

    def test_no_semantic_claim(self):
        self.assertFalse(self.check([self.add(approved=True)])["semantic_scope_verified"])

    def test_count(self):
        ids = [self.add(approved=True, prompt="Sentence " + str(i)) for i in range(2)]
        self.assertEqual(self.check(ids)["approved_example_count"], 2)
