import unittest
from unittest.mock import patch
from tempfile import TemporaryDirectory
from pathlib import Path
from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.learning.scoped_candidate_v1 import build_scoped_language_candidate_v1 as build


class ScopedCandidateV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.store = SQLiteFeedbackStore(Path(self.tmp.name) / "feedback.db")

    def invoke(self, **changes):
        kwargs = {"domain": "grammar", "source": "consented_feedback",
                  "human_approved": True}
        kwargs.update(changes)
        return build(self.store, "owner", **kwargs)

    def test_reject_general_knowledge(self):
        with self.assertRaisesRegex(ValueError, "learning_domain_out_of_scope"):
            self.invoke(domain="general_knowledge")

    def test_reject_programming(self):
        with self.assertRaisesRegex(ValueError, "learning_domain_out_of_scope"):
            self.invoke(domain="programming")

    def test_reject_unreviewed_web(self):
        with self.assertRaisesRegex(ValueError, "source_not_approved"):
            self.invoke(source="unreviewed_web")

    def test_reject_unapproved(self):
        with self.assertRaisesRegex(ValueError, "human_review_required"):
            self.invoke(human_approved=False)

    def test_reject_invalid_approval_type(self):
        with self.assertRaises(ValueError):
            self.invoke(human_approved=1)

    def test_reject_empty_owner(self):
        with self.assertRaises(ValueError):
            build(self.store, "", domain="grammar", source="consented_feedback",
                  human_approved=True)

    def test_reject_wrong_store(self):
        with self.assertRaises(ValueError):
            build(None, "owner", domain="grammar", source="consented_feedback",
                  human_approved=True)

    def test_reject_insufficient_accepted_examples(self):
        with self.assertRaisesRegex(ValueError, "five accepted"):
            self.invoke()

    def test_rejected_scope_does_not_train(self):
        with patch("languages.en.learning.scoped_candidate_v1.build_candidate") as train:
            with self.assertRaises(ValueError):
                self.invoke(domain="world_facts")
            train.assert_not_called()

    def test_empty_feedback_does_not_train(self):
        with patch("languages.en.learning.scoped_candidate_v1.build_candidate") as train:
            with self.assertRaises(ValueError):
                self.invoke()
            train.assert_not_called()

    def test_does_not_create_candidate_on_rejection(self):
        with patch("languages.en.learning.scoped_candidate_v1.build_candidate") as train:
            with self.assertRaises(ValueError):
                self.invoke(human_approved=False)
            train.assert_not_called()

    def test_valid_domain_still_requires_feedback(self):
        for domain in ("grammar", "morphology", "syntax", "vocabulary",
                       "orthography", "punctuation", "language_usage"):
            with self.subTest(domain=domain):
                with self.assertRaisesRegex(ValueError, "five accepted"):
                    self.invoke(domain=domain)
