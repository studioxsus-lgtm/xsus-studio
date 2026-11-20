import dataclasses
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from languages.en.data.preparation.corpus import parse_example
from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.learning.transactional_snapshot_v1 import (
    capture_transactional_learning_snapshot_v1 as capture,
    compare_transactional_learning_snapshot_v1 as compare,
)


class TransactionalSnapshotV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.store = SQLiteFeedbackStore(Path(self.tmp.name) / "feedback.db")

    def add(self, text="Hello", owner="alice", approved=True):
        item = self.store.submit(owner, parse_example({
            "prompt": text, "history": [], "response": "Hello back."
        }), consent=True)
        if approved is not None:
            self.store.review(owner, item.example_id, approved=approved)
        return item

    def test_empty(self):
        self.assertEqual(capture(self.store, "alice").count, 0)

    def test_approved_included(self):
        self.add()
        self.assertEqual(capture(self.store, "alice").count, 1)

    def test_pending_excluded(self):
        self.add(approved=None)
        self.assertEqual(capture(self.store, "alice").count, 0)

    def test_rejected_excluded(self):
        self.add(approved=False)
        self.assertEqual(capture(self.store, "alice").count, 0)

    def test_owner_isolation(self):
        self.add(owner="bob")
        self.assertEqual(capture(self.store, "alice").count, 0)

    def test_stable_digest(self):
        self.add()
        self.assertEqual(capture(self.store, "alice").sha256, capture(self.store, "alice").sha256)

    def test_sha256_length(self):
        self.assertEqual(len(capture(self.store, "alice").sha256), 64)

    def test_frozen_snapshot(self):
        snap = capture(self.store, "alice")
        with self.assertRaises(dataclasses.FrozenInstanceError):
            snap.owner_id = "bob"

    def test_frozen_example(self):
        self.add()
        snap = capture(self.store, "alice")
        with self.assertRaises(dataclasses.FrozenInstanceError):
            snap.examples[0].prompt = "changed"

    def test_new_feedback_does_not_mutate_old_snapshot(self):
        snap = capture(self.store, "alice")
        self.add()
        self.assertEqual(snap.count, 0)

    def test_detect_addition(self):
        snap = capture(self.store, "alice")
        self.add()
        self.assertFalse(compare(self.store, snap)["unchanged"])

    def test_detect_removal(self):
        item = self.add()
        snap = capture(self.store, "alice")
        self.store.forget("alice", item.example_id)
        self.assertFalse(compare(self.store, snap)["unchanged"])

    def test_detect_approval(self):
        item = self.add(approved=None)
        snap = capture(self.store, "alice")
        self.store.review("alice", item.example_id, approved=True)
        self.assertFalse(compare(self.store, snap)["unchanged"])

    def test_unapproved_addition_no_change(self):
        snap = capture(self.store, "alice")
        self.add(approved=None)
        self.assertTrue(compare(self.store, snap)["unchanged"])

    def test_no_training_claim(self):
        self.assertFalse(compare(self.store, capture(self.store, "alice"))["training_uses_frozen_snapshot"])

    def test_no_activation(self):
        self.assertFalse(compare(self.store, capture(self.store, "alice"))["production_activation_authorized"])

    def test_invalid_owner(self):
        with self.assertRaises(ValueError):
            capture(self.store, "")

    def test_invalid_store(self):
        with self.assertRaises(ValueError):
            capture(None, "alice")

    def test_invalid_snapshot(self):
        with self.assertRaises(ValueError):
            compare(self.store, None)
