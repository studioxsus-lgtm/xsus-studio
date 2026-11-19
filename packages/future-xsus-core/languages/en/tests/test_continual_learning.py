import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from core.contracts.request import Conversation
from languages.en.data.preparation.corpus import Example
from languages.en.learning.continual import build_candidate, promotion_decision
from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.models.checkpoint import save_checkpoint
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.text.tokenizer import BytePairTokenizer


class FeedbackStoreTests(unittest.TestCase):
    def test_consent_review_owner_isolation_and_forgetting(self):
        with TemporaryDirectory() as temporary:
            store = SQLiteFeedbackStore(Path(temporary) / "feedback.sqlite3")
            example = Example(Conversation("Explain a clear sentence."), "A clear sentence expresses one complete thought.")
            with self.assertRaisesRegex(ValueError, "consent"):
                store.submit("owner-a", example, consent=False)
            first = store.submit("owner-a", example, consent=True)
            duplicate = store.submit("owner-a", example, consent=True)
            self.assertEqual(first.example_id, duplicate.example_id)
            self.assertEqual(first.status, "pending")
            self.assertEqual(store.accepted("owner-a"), ())
            self.assertEqual(store.pending_ids("owner-a"), (first.example_id,))
            self.assertEqual(store.review("owner-a", first.example_id, approved=True).status, "accepted")
            self.assertEqual(len(store.accepted("owner-a")), 1)
            self.assertEqual(store.accepted("owner-b"), ())
            self.assertTrue(store.forget("owner-a", first.example_id))
            self.assertEqual(store.accepted("owner-a"), ())

    def test_review_is_one_way_and_rejected_examples_never_train(self):
        with TemporaryDirectory() as temporary:
            store = SQLiteFeedbackStore(Path(temporary) / "feedback.sqlite3")
            record = store.submit(
                "owner-a", Example(Conversation("Give a concise explanation."), "Use one short sentence."), consent=True,
            )
            rejected = store.review("owner-a", record.example_id, approved=False)
            self.assertEqual(rejected.status, "rejected")
            self.assertEqual(store.accepted("owner-a"), ())
            with self.assertRaisesRegex(ValueError, "cannot be changed"):
                store.review("owner-a", record.example_id, approved=True)


class LearningGateTests(unittest.TestCase):
    def test_candidate_cannot_overwrite_private_feedback_database(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            store = SQLiteFeedbackStore(root / "feedback.sqlite3")
            with self.assertRaisesRegex(ValueError, "separate from source artifacts"):
                build_candidate(
                    store, "owner-a",
                    baseline_path=root / "baseline.json.gz",
                    training_path=root / "training.jsonl",
                    evaluation_paths={"written-v4": root / "v4.jsonl", "written-v5": root / "v5.jsonl"},
                    candidate_path=root / "candidate.json.gz",
                    report_path=store.path,
                )

    def test_gate_requires_feedback_gain_and_no_held_out_regression(self):
        baseline = {
            name: {"cases": 10, "accepted": 9, "preserved_all_facts": 8}
            for name in ("written-v4", "written-v5")
        }
        candidate = {
            name: {"cases": 10, "accepted": 9, "preserved_all_facts": 8}
            for name in baseline
        }
        approved = promotion_decision(baseline, candidate, feedback_loss_before=2.0, feedback_loss_after=1.4)
        self.assertTrue(approved["eligible_for_promotion"])
        self.assertTrue(approved["requires_human_release"])

        candidate["written-v5"]["accepted"] = 8
        blocked = promotion_decision(baseline, candidate, feedback_loss_before=2.0, feedback_loss_after=1.4)
        self.assertFalse(blocked["eligible_for_promotion"])
        self.assertIn("benchmark_regression:written-v5:accepted", blocked["reasons"])

    def test_learning_cycle_warm_starts_and_writes_a_separate_candidate(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            baseline_path = root / "baseline.json.gz"
            candidate_path = root / "candidate.json.gz"
            report_path = root / "candidate-report.json"
            training_path = root / "training.jsonl"
            rows = [
                {"prompt": f"Curated prompt {index}", "response": f"Curated response {index}."}
                for index in range(6)
            ]
            training_path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
            written_v4_path = root / "v4.jsonl"
            written_v5_path = root / "v5.jsonl"
            written_v4_path.write_text("benchmark fixture v4\n", encoding="utf-8")
            written_v5_path.write_text("benchmark fixture v5\n", encoding="utf-8")
            tokenizer = BytePairTokenizer()
            model = NeuralLanguageModel.initialize(vocab_size=tokenizer.vocab_size, hidden_size=4, context_size=16, seed=17)
            save_checkpoint(baseline_path, tokenizer, model)
            store = SQLiteFeedbackStore(root / "feedback.sqlite3")
            for index in range(5):
                record = store.submit(
                    "owner-a",
                    Example(Conversation(f"Private reviewed prompt {index}"), f"Approved learning response {index}."),
                    consent=True,
                )
                store.review("owner-a", record.example_id, approved=True)
            case = SimpleNamespace(example=Example(Conversation("Independent held-out prompt"), "Independent reference."))
            scores = {"cases": 1, "accepted": 1, "preserved_all_facts": 1, "details": []}
            with patch("languages.en.learning.continual.load_cases", return_value=(case,)), \
                 patch("languages.en.learning.continual.compare_checkpoint", return_value=scores):
                report = build_candidate(
                    store, "owner-a",
                    baseline_path=baseline_path,
                    training_path=training_path,
                    evaluation_paths={"written-v4": written_v4_path, "written-v5": written_v5_path},
                    candidate_path=candidate_path,
                    report_path=report_path,
                    epochs=1,
                    replay_examples=2,
                )
            self.assertTrue(candidate_path.exists())
            self.assertTrue(report_path.exists())
            self.assertNotEqual(report["candidate_revision"], report["baseline_revision"])
            self.assertEqual(report["approved_feedback_examples"], 5)
            self.assertEqual(report["feedback_holdout_examples"], 1)
            self.assertTrue(report["requires_human_release"])
            self.assertEqual(
                report["input_sha256"]["baseline_checkpoint"],
                hashlib.sha256(baseline_path.read_bytes()).hexdigest(),
            )
            self.assertEqual(
                report["input_sha256"]["training_corpus"],
                hashlib.sha256(training_path.read_bytes()).hexdigest(),
            )
            self.assertEqual(set(report["input_sha256"]["evaluation_corpora"]), {"written-v4", "written-v5"})
            self.assertEqual(set(report["training_source_sha256"]), {
                "continual", "train", "model", "checkpoint", "tokenizer", "model_input",
            })

