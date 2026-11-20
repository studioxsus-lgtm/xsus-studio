import unittest
from unittest.mock import patch
from pathlib import Path
from tempfile import TemporaryDirectory
from languages.en.data.preparation.corpus import parse_example
from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.learning.drift_checked_candidate_v1 import (
    build_drift_checked_language_candidate_v1 as build,
)


class DriftCheckedCandidateV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.store = SQLiteFeedbackStore(Path(self.tmp.name) / "feedback.db")
        for i in range(5):
            item = self.store.submit("alice", parse_example({
                "prompt": "Sentence " + str(i), "history": [], "response": "Correct."
            }), consent=True)
            self.store.review("alice", item.example_id, approved=True)

    def test_stable_eligible_candidate(self):
        with patch("languages.en.learning.drift_checked_candidate_v1.build_verified_language_candidate_v1",
                   return_value={"candidate": {"eligible_for_promotion": True}}):
            result = build(self.store, "alice", domain="grammar")
        self.assertTrue(result["feedback_integrity"]["unchanged"])
        self.assertTrue(result["eligible_for_human_review"])
        self.assertFalse(result["automatic_promotion_authorized"])

    def test_stable_ineligible_candidate(self):
        with patch("languages.en.learning.drift_checked_candidate_v1.build_verified_language_candidate_v1",
                   return_value={"candidate": {"eligible_for_promotion": False}}):
            result = build(self.store, "alice", domain="grammar")
        self.assertFalse(result["eligible_for_human_review"])

    def test_added_feedback_detected(self):
        def train(*args, **kwargs):
            item = self.store.submit("alice", parse_example({
                "prompt": "Late sentence", "history": [], "response": "Correct."
            }), consent=True)
            self.store.review("alice", item.example_id, approved=True)
            return {"candidate": {"eligible_for_promotion": True}}
        with patch("languages.en.learning.drift_checked_candidate_v1.build_verified_language_candidate_v1",
                   side_effect=train):
            result = build(self.store, "alice", domain="grammar")
        self.assertFalse(result["feedback_integrity"]["unchanged"])
        self.assertFalse(result["eligible_for_human_review"])

    def test_removed_feedback_detected(self):
        def train(*args, **kwargs):
            self.store.forget("alice", self.store.accepted("alice")[0].example_id)
            return {"candidate": {"eligible_for_promotion": True}}
        with patch("languages.en.learning.drift_checked_candidate_v1.build_verified_language_candidate_v1",
                   side_effect=train):
            result = build(self.store, "alice", domain="grammar")
        self.assertFalse(result["eligible_for_human_review"])

    def test_no_transaction_claim(self):
        with patch("languages.en.learning.drift_checked_candidate_v1.build_verified_language_candidate_v1",
                   return_value={"candidate": {}}):
            result = build(self.store, "alice", domain="grammar")
        self.assertFalse(result["transactional_snapshot_guaranteed"])

    def test_insufficient_feedback(self):
        for record in self.store.accepted("alice")[:1]:
            self.store.forget("alice", record.example_id)
        with self.assertRaisesRegex(ValueError, "five approved"):
            build(self.store, "alice", domain="grammar")

    def test_invalid_domain_passed_to_verifier(self):
        with patch("languages.en.learning.drift_checked_candidate_v1.build_verified_language_candidate_v1",
                   side_effect=ValueError("scope rejected")):
            with self.assertRaisesRegex(ValueError, "scope rejected"):
                build(self.store, "alice", domain="general_knowledge")
