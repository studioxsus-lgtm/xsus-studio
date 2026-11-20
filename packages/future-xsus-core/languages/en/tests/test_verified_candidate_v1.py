import unittest
from unittest.mock import patch
from pathlib import Path
from tempfile import TemporaryDirectory
from languages.en.data.preparation.corpus import parse_example
from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.learning.verified_candidate_v1 import (
    build_verified_language_candidate_v1 as build,
)


class VerifiedCandidateV1Tests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.store = SQLiteFeedbackStore(Path(self.temp.name) / "feedback.db")

    def add(self, index, approved=True, owner="alice"):
        item = self.store.submit(owner, parse_example({
            "prompt": "Sentence number " + str(index),
            "history": [],
            "response": "A valid sentence.",
        }), consent=True)
        if approved is not None:
            self.store.review(owner, item.example_id, approved=approved)
        return item

    def populate(self, count=5):
        for i in range(count):
            self.add(i)

    def test_no_feedback_rejected(self):
        with self.assertRaisesRegex(ValueError, "five approved"):
            build(self.store, "alice", domain="grammar")

    def test_four_feedback_rejected(self):
        self.populate(4)
        with self.assertRaises(ValueError):
            build(self.store, "alice", domain="grammar")

    def test_pending_not_counted(self):
        self.populate(4)
        self.add(4, approved=None)
        with self.assertRaises(ValueError):
            build(self.store, "alice", domain="grammar")

    def test_rejected_not_counted(self):
        self.populate(4)
        self.add(4, approved=False)
        with self.assertRaises(ValueError):
            build(self.store, "alice", domain="grammar")

    def test_cross_owner_not_counted(self):
        self.populate(4)
        self.add(4, owner="bob")
        with self.assertRaises(ValueError):
            build(self.store, "alice", domain="grammar")

    def test_out_of_scope_rejected_before_training(self):
        self.populate()
        with patch("languages.en.learning.verified_candidate_v1.build_candidate") as train:
            with self.assertRaisesRegex(ValueError, "scope rejected"):
                build(self.store, "alice", domain="general_knowledge")
            train.assert_not_called()

    def test_programming_rejected_before_training(self):
        self.populate()
        with patch("languages.en.learning.verified_candidate_v1.build_candidate") as train:
            with self.assertRaises(ValueError):
                build(self.store, "alice", domain="programming")
            train.assert_not_called()

    def test_verified_examples_reach_existing_trainer(self):
        self.populate()
        with patch("languages.en.learning.verified_candidate_v1.build_candidate", return_value={"eligible_for_promotion": False}) as train:
            result = build(self.store, "alice", domain="grammar", epochs=1)
        train.assert_called_once_with(self.store, "alice", epochs=1)
        self.assertEqual(result["verification"]["approved_example_count"], 5)

    def test_no_automatic_promotion(self):
        self.populate()
        with patch("languages.en.learning.verified_candidate_v1.build_candidate", return_value={}) as train:
            result = build(self.store, "alice", domain="grammar")
        self.assertFalse(result["automatic_promotion_authorized"])

    def test_no_semantic_claim(self):
        self.populate()
        with patch("languages.en.learning.verified_candidate_v1.build_candidate", return_value={}) as train:
            result = build(self.store, "alice", domain="grammar")
        self.assertFalse(result["semantic_scope_verified"])

    def test_no_authentication_claim(self):
        self.populate()
        with patch("languages.en.learning.verified_candidate_v1.build_candidate", return_value={}) as train:
            result = build(self.store, "alice", domain="grammar")
        self.assertFalse(result["owner_authenticated_by_this_function"])

    def test_invalid_store(self):
        with self.assertRaises(ValueError):
            build(None, "alice", domain="grammar")

    def test_invalid_owner(self):
        with self.assertRaises(ValueError):
            build(self.store, "", domain="grammar")

    def test_different_language_domain(self):
        self.populate()
        with patch("languages.en.learning.verified_candidate_v1.build_candidate", return_value={}) as train:
            result = build(self.store, "alice", domain="syntax")
        self.assertEqual(result["verification"]["domain"], "syntax")
