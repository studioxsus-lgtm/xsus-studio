"""Real neural training via the opt-in coordinator; benchmark adapter mocked.

This is a bounded smoke test, not independent benchmark validation.
"""
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from core.contracts.request import Conversation
from languages.en.data.preparation.corpus import Example
from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.learning.autonomous_candidate_cycle_v1 import (
    CandidateCycleRequestV1, execute_autonomous_candidate_cycle_v1,
)
from languages.en.learning.candidate_cycle_journal_v1 import inspect_candidate_cycle_journal_v1
from languages.en.models.checkpoint import save_checkpoint, load_checkpoint
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.text.tokenizer import BytePairTokenizer


class RealCandidateCycleSmokeV1Tests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root=Path(self.temp.name)
        self.store=SQLiteFeedbackStore(root/"feedback.sqlite3")
        training=root/"training.jsonl"
        training.write_text("".join(json.dumps({
            "prompt":f"Curated prompt {i}",
            "response":f"Curated response {i}."})+"\n" for i in range(6)),encoding="utf-8")
        for i in range(5):
            record=self.store.submit("owner-a",Example(
                Conversation(f"Private reviewed prompt {i}"),
                f"Approved learning response {i}."),consent=True)
            self.store.review("owner-a",record.example_id,approved=True)
        tokenizer=BytePairTokenizer()
        model=NeuralLanguageModel.initialize(
            vocab_size=tokenizer.vocab_size,hidden_size=4,context_size=16,seed=17)
        baseline=root/"baseline.json.gz"
        save_checkpoint(baseline,tokenizer,model)
        v4=root/"v4.jsonl"
        v5=root/"v5.jsonl"
        v4.write_text("benchmark fixture v4\n")
        v5.write_text("benchmark fixture v5\n")
        self.request=CandidateCycleRequestV1(
            "owner-a","grammar",baseline,training,
            {"written-v4":v4,"written-v5":v5},
            root/"candidate.json.gz",root/"report.json",
            epochs=1,replay_examples=2)

    def _train(self):
        case=SimpleNamespace(example=Example(
            Conversation("Independent held-out prompt"),"Independent reference."))
        scores={"cases":1,"accepted":1,"preserved_all_facts":1,"details":[]}
        # Real model train_step, checkpoint writes and loss calculations run.
        # Only benchmark loading and scoring are stubbed for fixture isolation.
        with patch("languages.en.learning.continual.load_cases",return_value=(case,)), \
             patch("languages.en.learning.continual.compare_checkpoint",return_value=scores):
            return execute_autonomous_candidate_cycle_v1(
                self.store,self.request,approved_execution=True)

    def test_real_training_creates_candidate(self):
        self._train()
        self.assertTrue(self.request.candidate_path.is_file())

    def test_real_training_creates_report(self):
        self._train()
        self.assertTrue(self.request.report_path.is_file())

    def test_real_training_changes_checkpoint_revision(self):
        result=self._train()["candidate_report"]
        self.assertNotEqual(result["candidate_revision"],result["baseline_revision"])

    def test_real_training_checkpoint_loadable(self):
        self._train()
        tokenizer,model,revision=load_checkpoint(self.request.candidate_path)
        self.assertTrue(revision)

    def test_real_training_records_losses(self):
        result=self._train()["candidate_report"]
        self.assertIsInstance(result["feedback_loss_before"],float)
        self.assertIsInstance(result["feedback_loss_after"],float)

    def test_real_training_journal_completed(self):
        self._train()
        self.assertEqual(inspect_candidate_cycle_journal_v1(
            self.request.report_path).state,"completed")

    def test_real_training_requires_human_release(self):
        self.assertTrue(self._train()["human_release_required"])

    def test_real_training_no_production_deployment(self):
        self.assertFalse(self._train()["production_deployed"])

    def test_real_training_benchmark_keys(self):
        result=self._train()["candidate_report"]
        self.assertEqual(set(result["benchmarks"]),{"written-v4","written-v5"})

    def test_real_training_approved_feedback_count(self):
        result=self._train()["candidate_report"]
        self.assertEqual(result["approved_feedback_examples"],5)
