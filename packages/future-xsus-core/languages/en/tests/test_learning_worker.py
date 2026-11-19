import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from core.contracts.request import Conversation
from languages.en.data.preparation.corpus import Example
from languages.en.learning.continual import build_candidate
from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.learning.worker import run_all_owners_once, run_once, run_supervised_cycle
from languages.en.models.checkpoint import save_checkpoint
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.models.registry import EnglishModelRegistry
from languages.en.text.tokenizer import BytePairTokenizer


class LearningWorkerTests(unittest.TestCase):
    def test_all_owner_worker_uses_fair_bounded_cycles_and_hides_owner_ids(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            store = SQLiteFeedbackStore(root / "feedback.sqlite3")
            registry = EnglishModelRegistry(root / "registry")
            output = root / "candidates"
            for owner in ("owner-a", "owner-b"):
                for index in range(5):
                    record = store.submit(
                        owner,
                        Example(
                            Conversation(f"Feedback prompt {owner} {index}"),
                            f"Reviewed response {owner} {index}.",
                        ),
                        consent=True,
                    )
                    store.review(owner, record.example_id, approved=True)

            processed = []

            def cycle(*, owner_id, **kwargs):
                processed.append(owner_id)
                return {"status": "candidate_blocked", "owner_scope": "safe-scope"}

            with patch("languages.en.learning.worker.run_supervised_cycle", side_effect=cycle):
                first = run_all_owners_once(
                    store=store, registry=registry, output_dir=output, max_cycles_per_poll=1,
                )
                second = run_all_owners_once(
                    store=store, registry=registry, output_dir=output, max_cycles_per_poll=1,
                )

            self.assertEqual(first["eligible_owners"], 2)
            self.assertEqual(first["processed_owners"], 1)
            self.assertEqual(second["processed_owners"], 1)
            self.assertEqual(set(processed), {"owner-a", "owner-b"})
            self.assertEqual(len(set(processed)), 2)
            fleet_status = (output / "fleet-status.json").read_text(encoding="utf-8")
            self.assertNotIn("owner-a", fleet_status)
            self.assertNotIn("owner-b", fleet_status)

    def test_all_owner_worker_rejects_unbounded_batch_size(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            store = SQLiteFeedbackStore(root / "feedback.sqlite3")
            registry = EnglishModelRegistry(root / "registry")
            with self.assertRaises(ValueError):
                run_all_owners_once(
                    store=store, registry=registry, output_dir=root / "candidates",
                    max_cycles_per_poll=101,
                )

    def test_supervised_cycle_persists_waiting_and_failure_states(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            store = SQLiteFeedbackStore(root / "feedback.sqlite3")
            registry = EnglishModelRegistry(root / "registry")
            output = root / "candidates"
            with patch("languages.en.learning.worker.run_once", return_value={
                "status": "waiting_for_feedback", "approved_examples": 0,
                "minimum_approved_examples": 5,
            }):
                waiting = run_supervised_cycle(
                    store=store, owner_id="owner-a", registry=registry, output_dir=output,
                )
            status_path = Path(waiting["status_file"])
            snapshot = json.loads(status_path.read_text(encoding="utf-8"))
            self.assertEqual(snapshot["format"], "xsus-en-learning-worker-status-v1")
            self.assertEqual(snapshot["status"], "waiting_for_feedback")

            with patch("languages.en.learning.worker.run_once", side_effect=RuntimeError("temporary failure")):
                failed = run_supervised_cycle(
                    store=store, owner_id="owner-a", registry=registry, output_dir=output,
                )
            snapshot = json.loads(status_path.read_text(encoding="utf-8"))
            self.assertEqual(failed["status"], "failed")
            self.assertEqual(snapshot["error_type"], "RuntimeError")
            self.assertEqual(snapshot["reason"], "temporary failure")

    def test_worker_builds_once_per_approved_dataset_and_never_promotes(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            store = SQLiteFeedbackStore(root / "feedback.sqlite3")
            registry = EnglishModelRegistry(root / "registry")
            baseline = root / "baseline.json.gz"
            tokenizer = BytePairTokenizer()
            model = NeuralLanguageModel.initialize(
                vocab_size=tokenizer.vocab_size, hidden_size=4, context_size=16, seed=71,
            )
            save_checkpoint(baseline, tokenizer, model)
            for index in range(5):
                record = store.submit(
                    "owner-a",
                    Example(
                        Conversation(f"Private worker example prompt {index}"),
                        f"Distinct reviewed answer number {index}.",
                    ),
                    consent=True,
                )
                store.review("owner-a", record.example_id, approved=True)

            benchmark_scores = {"cases": 1, "accepted": 1, "preserved_all_facts": 1}
            with patch("languages.en.learning.worker._DEFAULT_BASELINE", baseline), \
                 patch("languages.en.learning.continual.compare_checkpoint", return_value=benchmark_scores), \
                 patch("languages.en.learning.worker.build_candidate", wraps=build_candidate) as build:
                first = run_once(
                    store=store, owner_id="owner-a", registry=registry,
                    output_dir=root / "candidates", replay_examples=8,
                )
                second = run_once(
                    store=store, owner_id="owner-a", registry=registry,
                    output_dir=root / "candidates", replay_examples=8,
                )
                self.assertEqual(build.call_count, 1)
                self.assertIn(first["status"], {"candidate_ready", "candidate_blocked"})
                self.assertEqual(second["candidate_revision"], first["candidate_revision"])
                self.assertIsNone(registry.active())

                record = store.submit(
                    "owner-a",
                    Example(Conversation("One newly approved worker example prompt"), "One new reviewed answer."),
                    consent=True,
                )
                store.review("owner-a", record.example_id, approved=True)
                third = run_once(
                    store=store, owner_id="owner-a", registry=registry,
                    output_dir=root / "candidates", replay_examples=8,
                )
                self.assertEqual(build.call_count, 2)
                self.assertNotEqual(third["feedback_set_revision"], first["feedback_set_revision"])
                self.assertNotEqual(third["candidate_revision"], first["candidate_revision"])
                self.assertIsNone(registry.active())

                for index in range(5):
                    record = store.submit(
                        "owner-b",
                        Example(
                            Conversation(f"Private worker example prompt {index}"),
                            f"Distinct reviewed answer number {index}.",
                        ),
                        consent=True,
                    )
                    store.review("owner-b", record.example_id, approved=True)
                other_owner = run_once(
                    store=store, owner_id="owner-b", registry=registry,
                    output_dir=root / "candidates", replay_examples=8,
                )
                self.assertEqual(build.call_count, 3)
                self.assertNotEqual(other_owner["owner_scope"], first["owner_scope"])
                self.assertNotEqual(other_owner["registry"], first["registry"])
                self.assertNotEqual(other_owner["candidate"], first["candidate"])
                self.assertIsNone(registry.active())

    def test_worker_waits_until_feedback_has_a_held_out_example(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            store = SQLiteFeedbackStore(root / "feedback.sqlite3")
            registry = EnglishModelRegistry(root / "registry")
            result = run_once(
                store=store, owner_id="owner-a", registry=registry,
                output_dir=root / "candidates",
            )
            self.assertEqual(result["status"], "waiting_for_feedback")
            self.assertEqual(result["approved_examples"], 0)
            self.assertEqual(result["minimum_approved_examples"], 5)
            self.assertEqual(len(result["owner_scope"]), 64)
