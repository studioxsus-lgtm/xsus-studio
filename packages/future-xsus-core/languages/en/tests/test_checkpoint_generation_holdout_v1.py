"""Checkpoint-backed holdout bridge integration with real checkpoint serialization."""
import json
import tempfile
import unittest
from pathlib import Path

from languages.en.models.checkpoint import save_checkpoint, load_checkpoint
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.text.tokenizer import BytePairTokenizer
from languages.en.evaluation.checkpoint_generation_holdout_v1 import (
    inspect_checkpoint_generation_holdout_v1 as evaluate,
)


class CheckpointGenerationHoldoutTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / "model.json.gz"
        tokenizer = BytePairTokenizer()
        model = NeuralLanguageModel.initialize(
            vocab_size=tokenizer.vocab_size, hidden_size=4,
            context_size=16, seed=37,
        )
        save_checkpoint(self.path, tokenizer, model)
        self.prompts = ["Synthetic alpha question", "Synthetic beta question"]
        self.references = ["Alpha", "Beta"]

    def evaluate(self, **kwargs):
        return evaluate(
            self.path, self.prompts, self.references,
            independent_holdout=True, max_new_tokens=2, **kwargs,
        )

    def test_loaded_checkpoint_runs_all_context_windows(self):
        report = self.evaluate()
        self.assertEqual(set(report["generation"]["scoring"]["windows"]), {"16", "32", "64"})
        self.assertEqual(report["generation"]["cases"], 2)

    def test_revision_matches_checkpoint_loader(self):
        self.assertEqual(self.evaluate()["checkpoint_revision"], load_checkpoint(self.path)[2])

    def test_checkpoint_bytes_unchanged(self):
        before = self.path.read_bytes()
        self.evaluate()
        self.assertEqual(self.path.read_bytes(), before)

    def test_repeated_scoring_is_deterministic(self):
        self.assertEqual(self.evaluate(), self.evaluate())

    def test_independence_attestation_is_not_verification(self):
        self.assertTrue(self.evaluate()["holdout_independence_attested_not_verified"])

    def test_no_release_or_training_authorized(self):
        report = self.evaluate()
        self.assertFalse(report["release_authorized"])
        self.assertFalse(report["weights_retrained"])
        self.assertFalse(report["generation"]["scoring"]["comparison"]["training_authorized"])

    def test_raw_text_not_in_report(self):
        report = self.evaluate()
        serialized = json.dumps(report, allow_nan=False)
        self.assertNotIn(self.prompts[0], serialized)
        self.assertNotIn(self.references[0], serialized)

    def test_missing_attestation_rejected(self):
        with self.assertRaises(ValueError):
            evaluate(self.path, self.prompts, self.references)

    def test_mismatched_examples_rejected(self):
        self.references.pop()
        with self.assertRaises(ValueError):
            self.evaluate()

    def test_invalid_prompt_rejected(self):
        self.prompts[0] = " "
        with self.assertRaises(ValueError):
            self.evaluate()

    def test_invalid_reference_rejected(self):
        self.references[0] = ""
        with self.assertRaises(ValueError):
            self.evaluate()

    def test_missing_checkpoint_rejected(self):
        self.path.unlink()
        with self.assertRaises(FileNotFoundError):
            self.evaluate()

    def test_invalid_checkpoint_rejected(self):
        self.path.write_bytes(b"invalid gzip")
        with self.assertRaises(ValueError):
            self.evaluate()

    def test_json_round_trip(self):
        report = self.evaluate()
        self.assertEqual(json.loads(json.dumps(report, allow_nan=False)), report)


if __name__ == "__main__":
    unittest.main()
