import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from languages.en.data.preparation.corpus import parse_example
from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.learning.feedback_snapshot_v1 import (
    capture_feedback_snapshot_v1 as capture,
    verify_feedback_snapshot_v1 as verify,
    require_unchanged_feedback_v1 as require,
)


class FeedbackSnapshotV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.store = SQLiteFeedbackStore(Path(self.tmp.name) / "feedback.db")

    def add(self, prompt="Example one", approved=True, owner="alice"):
        item = self.store.submit(owner, parse_example({
            "prompt": prompt, "history": [], "response": "Example response."
        }), consent=True)
        if approved is not None:
            self.store.review(owner, item.example_id, approved=approved)
        return item

    def test_empty_snapshot(self):
        self.assertEqual(capture(self.store, "alice").count, 0)

    def test_stable_snapshot(self):
        self.add()
        a = capture(self.store, "alice")
        self.assertEqual(a, capture(self.store, "alice"))

    def test_digest_length(self):
        self.assertEqual(len(capture(self.store, "alice").digest), 64)

    def test_approved_count(self):
        self.add()
        self.assertEqual(capture(self.store, "alice").count, 1)

    def test_pending_excluded(self):
        self.add(approved=None)
        self.assertEqual(capture(self.store, "alice").count, 0)

    def test_rejected_excluded(self):
        self.add(approved=False)
        self.assertEqual(capture(self.store, "alice").count, 0)

    def test_other_owner_excluded(self):
        self.add(owner="bob")
        self.assertEqual(capture(self.store, "alice").count, 0)

    def test_new_accepted_detected(self):
        before = capture(self.store, "alice")
        self.add()
        self.assertFalse(verify(self.store, before)["unchanged"])

    def test_removed_accepted_detected(self):
        item = self.add()
        before = capture(self.store, "alice")
        self.store.forget("alice", item.example_id)
        self.assertFalse(verify(self.store, before)["unchanged"])

    def test_unapproved_does_not_change_snapshot(self):
        before = capture(self.store, "alice")
        self.add(approved=None)
        self.assertTrue(verify(self.store, before)["unchanged"])

    def test_require_unchanged_passes(self):
        require(self.store, capture(self.store, "alice"))

    def test_require_unchanged_raises(self):
        before = capture(self.store, "alice")
        self.add()
        with self.assertRaisesRegex(ValueError, "changed"):
            require(self.store, before)

    def test_invalid_store(self):
        with self.assertRaises(ValueError):
            capture(None, "alice")

    def test_invalid_owner(self):
        with self.assertRaises(ValueError):
            capture(self.store, "")

    def test_invalid_snapshot(self):
        with self.assertRaises(ValueError):
            verify(self.store, None)

    def test_no_atomic_claim(self):
        self.assertFalse(verify(self.store, capture(self.store, "alice"))["atomic_snapshot_guaranteed"])

    def test_not_training_authorization(self):
        self.assertFalse(verify(self.store, capture(self.store, "alice"))["training_authorized"])
