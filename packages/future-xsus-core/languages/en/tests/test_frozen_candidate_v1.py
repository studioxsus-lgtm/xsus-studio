import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from languages.en.data.preparation.corpus import parse_example
from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.learning.frozen_candidate_v1 import (
    build_frozen_language_candidate_v1 as build,
)


class FrozenCandidateV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.store = SQLiteFeedbackStore(Path(self.tmp.name) / "feedback.db")
        for i in range(5):
            self.add(i)

    def add(self, i, owner="alice", approved=True):
        record = self.store.submit(owner, parse_example({
            "prompt": "Sentence " + str(i), "history": [], "response": "Correct."
        }), consent=True)
        if approved is not None:
            self.store.review(owner, record.example_id, approved=approved)
        return record

    def test_trainer_receives_frozen_records(self):
        def fake_train(store, owner_id, **kwargs):
            self.assertEqual(len(store.accepted(owner_id)), 5)
            self.add(99)
            self.assertEqual(len(store.accepted(owner_id)), 5)
            return {"eligible_for_promotion": False}
        with patch("languages.en.learning.frozen_candidate_v1.build_candidate", side_effect=fake_train):
            result = build(self.store, "alice", domain="grammar")
        self.assertEqual(result["snapshot_example_count"], 5)
        self.assertTrue(result["training_uses_frozen_feedback"])

    def test_new_feedback_during_training_not_used(self):
        def fake_train(store, owner_id, **kwargs):
            self.add(100)
            self.assertEqual(len(store.accepted(owner_id)), 5)
            return {}
        with patch("languages.en.learning.frozen_candidate_v1.build_candidate", side_effect=fake_train):
            build(self.store, "alice", domain="syntax")

    def test_frozen_store_blocks_cross_owner(self):
        def fake_train(store, owner_id, **kwargs):
            with self.assertRaises(ValueError):
                store.accepted("bob")
            return {}
        with patch("languages.en.learning.frozen_candidate_v1.build_candidate", side_effect=fake_train):
            build(self.store, "alice", domain="grammar")

    def test_out_of_scope_does_not_train(self):
        with patch("languages.en.learning.frozen_candidate_v1.build_candidate") as train:
            with self.assertRaisesRegex(ValueError, "scope rejected"):
                build(self.store, "alice", domain="programming")
            train.assert_not_called()

    def test_general_knowledge_does_not_train(self):
        with patch("languages.en.learning.frozen_candidate_v1.build_candidate") as train:
            with self.assertRaises(ValueError):
                build(self.store, "alice", domain="general_knowledge")
            train.assert_not_called()

    def test_no_auto_promotion(self):
        with patch("languages.en.learning.frozen_candidate_v1.build_candidate", return_value={}):
            result = build(self.store, "alice", domain="grammar")
        self.assertFalse(result["automatic_promotion_authorized"])

    def test_no_semantic_verification_claim(self):
        with patch("languages.en.learning.frozen_candidate_v1.build_candidate", return_value={}):
            result = build(self.store, "alice", domain="grammar")
        self.assertFalse(result["semantic_scope_verified"])

    def test_no_owner_authentication_claim(self):
        with patch("languages.en.learning.frozen_candidate_v1.build_candidate", return_value={}):
            result = build(self.store, "alice", domain="grammar")
        self.assertFalse(result["owner_authenticated_by_this_function"])

    def test_missing_feedback(self):
        for record in self.store.accepted("alice")[:1]:
            self.store.forget("alice", record.example_id)
        with self.assertRaisesRegex(ValueError, "five approved"):
            build(self.store, "alice", domain="grammar")

    def test_invalid_store(self):
        with self.assertRaises(ValueError):
            build(None, "alice", domain="grammar")

    def test_invalid_owner(self):
        with self.assertRaises(ValueError):
            build(self.store, "", domain="grammar")

    def test_options_forwarded(self):
        def fake_train(store, owner_id, **kwargs):
            self.assertEqual(kwargs["epochs"], 2)
            return {}
        with patch("languages.en.learning.frozen_candidate_v1.build_candidate", side_effect=fake_train):
            build(self.store, "alice", domain="grammar", epochs=2)

    def test_report_has_sha256(self):
        with patch("languages.en.learning.frozen_candidate_v1.build_candidate", return_value={}):
            result = build(self.store, "alice", domain="grammar")
        self.assertEqual(len(result["snapshot_sha256"]), 64)
