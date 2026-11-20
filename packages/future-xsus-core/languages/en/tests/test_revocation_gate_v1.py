import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from languages.en.data.preparation.corpus import parse_example
from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.learning.revocation_gate_v1 import (
    build_revocation_checked_candidate_v1 as build,
)


class RevocationGateV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.store = SQLiteFeedbackStore(Path(self.tmp.name) / "feedback.db")
        for i in range(5):
            self.add(i)

    def add(self, i, approved=True):
        record = self.store.submit("alice", parse_example({
            "prompt": "Sentence " + str(i), "history": [], "response": "Correct."
        }), consent=True)
        if approved is not None:
            self.store.review("alice", record.example_id, approved=approved)
        return record

    def mock_train(self, side_effect=None, eligible=True):
        from languages.en.learning.transactional_snapshot_v1 import capture_transactional_learning_snapshot_v1
        def fake(store, owner, **kwargs):
            snapshot = capture_transactional_learning_snapshot_v1(store, owner)
            if side_effect:
                side_effect()
            return {
                "snapshot_sha256": snapshot.sha256,
                "snapshot_example_count": snapshot.count,
                "training_uses_frozen_feedback": True,
                "candidate": {"eligible_for_promotion": eligible},
            }
        return patch("languages.en.learning.revocation_gate_v1.build_frozen_language_candidate_v1", side_effect=fake)

    def test_stable_eligible(self):
        with self.mock_train():
            result = build(self.store, "alice", domain="grammar")
        self.assertTrue(result["eligible_for_human_review"])

    def test_revocation_detected(self):
        def revoke():
            record = self.store.accepted("alice")[0]
            self.store.forget("alice", record.example_id)
        with self.mock_train(side_effect=revoke):
            result = build(self.store, "alice", domain="grammar")
        self.assertIn("approved_feedback_changed", result["reasons"])
        self.assertFalse(result["eligible_for_human_review"])

    def test_new_approval_detected(self):
        with self.mock_train(side_effect=lambda: self.add(100)):
            result = build(self.store, "alice", domain="grammar")
        self.assertFalse(result["eligible_for_human_review"])

    def test_pending_does_not_change_approved_set(self):
        with self.mock_train(side_effect=lambda: self.add(100, approved=None)):
            result = build(self.store, "alice", domain="grammar")
        self.assertTrue(result["eligible_for_human_review"])

    def test_quality_gate_failure(self):
        with self.mock_train(eligible=False):
            result = build(self.store, "alice", domain="grammar")
        self.assertIn("candidate_quality_gate_not_passed", result["reasons"])

    def test_missing_candidate_eligibility(self):
        with patch("languages.en.learning.revocation_gate_v1.build_frozen_language_candidate_v1", return_value={}):
            result = build(self.store, "alice", domain="grammar")
        self.assertFalse(result["eligible_for_human_review"])

    def test_snapshot_mismatch(self):
        with patch("languages.en.learning.revocation_gate_v1.build_frozen_language_candidate_v1",
                   return_value={"snapshot_sha256": "bad", "snapshot_example_count": 5,
                                 "training_uses_frozen_feedback": True,
                                 "candidate": {"eligible_for_promotion": True}}):
            result = build(self.store, "alice", domain="grammar")
        self.assertIn("training_snapshot_mismatch", result["reasons"])

    def test_no_auto_promotion(self):
        with self.mock_train():
            result = build(self.store, "alice", domain="grammar")
        self.assertFalse(result["automatic_promotion_authorized"])

    def test_no_continuous_enforcement_claim(self):
        with self.mock_train():
            result = build(self.store, "alice", domain="grammar")
        self.assertFalse(result["continuous_revocation_enforcement"])

    def test_no_production_activation(self):
        with self.mock_train():
            result = build(self.store, "alice", domain="grammar")
        self.assertFalse(result["production_activation_authorized"])

    def test_fewer_than_five(self):
        self.store.forget("alice", self.store.accepted("alice")[0].example_id)
        with self.assertRaises(ValueError):
            build(self.store, "alice", domain="grammar")

    def test_wrong_owner(self):
        with self.assertRaises(ValueError):
            build(self.store, "bob", domain="grammar")

    def test_invalid_store(self):
        with self.assertRaises(ValueError):
            build(None, "alice", domain="grammar")

    def test_invalid_owner(self):
        with self.assertRaises(ValueError):
            build(self.store, "", domain="grammar")
