"""Verify exact split isolation and checkpoint integrity for real generation."""
import json
import tempfile
import unittest
from pathlib import Path

from languages.en.models.checkpoint import save_checkpoint
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.text.tokenizer import BytePairTokenizer
from languages.en.evaluation.verified_checkpoint_holdout_v1 import (
    inspect_verified_checkpoint_holdout_v1 as inspect,
)


class VerifiedCheckpointHoldoutTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.checkpoint = root / "model.gz"
        self.training = root / "training.jsonl"
        self.evaluation = root / "evaluation.jsonl"
        tokenizer = BytePairTokenizer()
        model = NeuralLanguageModel.initialize(
            vocab_size=tokenizer.vocab_size, hidden_size=3,
            context_size=16, seed=41,
        )
        save_checkpoint(self.checkpoint, tokenizer, model)
        self.write(self.training, [
            {"prompt": "Training one", "response": "A"},
            {"prompt": "Training two", "response": "B"},
        ])
        self.write(self.evaluation, [
            {"id": "case-a", "prompt": "Evaluation one", "response": "A",
             "facts": [], "patterns": ["a"]},
            {"id": "case-b", "prompt": "Evaluation two", "response": "B",
             "facts": [], "patterns": ["b"]},
        ])

    @staticmethod
    def write(path, rows):
        path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")

    def evaluate(self, **kwargs):
        return inspect(self.checkpoint, [self.training], self.evaluation,
                       max_new_tokens=1, **kwargs)

    def test_checkpoint_benchmark_runs(self):
        result = self.evaluate()
        self.assertEqual(result["cases"], 2)
        self.assertEqual(set(result["result"]["generation"]["scoring"]["windows"]),
                         {"16", "32", "64"})

    def test_supplied_corpora_overlap_checked_but_provenance_unverified(self):
        result = self.evaluate()
        self.assertTrue(result["checked_training_conversation_overlap"])
        self.assertFalse(result["checkpoint_training_provenance_verified"])

    def test_no_release_authorization(self):
        result = self.evaluate()
        self.assertFalse(result["release_authorized"])
        self.assertFalse(result["weights_retrained"])

    def test_input_files_unchanged(self):
        before = [path.read_bytes() for path in
                  (self.checkpoint, self.training, self.evaluation)]
        self.evaluate()
        after = [path.read_bytes() for path in
                 (self.checkpoint, self.training, self.evaluation)]
        self.assertEqual(before, after)

    def test_overlapping_training_and_evaluation_rejected(self):
        self.write(self.training, [
            {"prompt": "Evaluation one", "response": "Different"},
            {"prompt": "Training two", "response": "B"},
        ])
        with self.assertRaises(ValueError):
            self.evaluate()

    def test_casefolded_whitespace_overlap_rejected(self):
        self.write(self.training, [
            {"prompt": " evaluation   ONE ", "response": "Different"},
            {"prompt": "Training two", "response": "B"},
        ])
        with self.assertRaises(ValueError):
            self.evaluate()

    def test_duplicate_training_conversations_rejected(self):
        self.write(self.training, [
            {"prompt": "Training one", "response": "A"},
            {"prompt": "Training one", "response": "B"},
        ])
        with self.assertRaises(ValueError):
            self.evaluate()

    def test_duplicate_holdout_conversations_rejected(self):
        self.write(self.evaluation, [
            {"id": "case-a", "prompt": "Evaluation one", "response": "A",
             "facts": [], "patterns": ["a"]},
            {"id": "case-b", "prompt": "Evaluation one", "response": "B",
             "facts": [], "patterns": ["b"]},
        ])
        with self.assertRaises(ValueError):
            self.evaluate()

    def test_history_bearing_cases_rejected(self):
        self.write(self.evaluation, [
            {"id": "case-a", "prompt": "Evaluation one", "response": "A",
             "history": [{"role": "user", "text": "Previous"}],
             "facts": [], "patterns": ["a"]},
            {"id": "case-b", "prompt": "Evaluation two", "response": "B",
             "facts": [], "patterns": ["b"]},
        ])
        with self.assertRaises(ValueError):
            self.evaluate()

    def test_duplicate_file_paths_rejected(self):
        with self.assertRaises(ValueError):
            inspect(self.checkpoint, [self.training, self.training],
                    self.evaluation, max_new_tokens=1)

    def test_missing_training_corpus_rejected(self):
        with self.assertRaises(ValueError):
            inspect(self.checkpoint, [], self.evaluation, max_new_tokens=1)

    def test_hashes_and_privacy(self):
        report = self.evaluate()
        self.assertEqual(len(report["checkpoint_sha256"]), 64)
        self.assertEqual(len(report["evaluation_sha256"]), 64)
        self.assertEqual(len(report["training_sha256"]), 1)
        self.assertNotIn("Evaluation one", json.dumps(report))
        self.assertNotIn("Training one", json.dumps(report))

    def test_deterministic(self):
        self.assertEqual(self.evaluate(), self.evaluate())


if __name__ == "__main__":
    unittest.main()
