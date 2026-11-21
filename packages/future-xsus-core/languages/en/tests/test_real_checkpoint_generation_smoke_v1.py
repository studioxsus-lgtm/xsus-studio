"""Real stored checkpoint smoke test: execution, not proof of answer quality.

Runs a small read-only, single-token diagnostic against the repository's
written-v5 checkpoint. Reference cases are not claimed to be independent.
"""
import hashlib
import json
import unittest
from pathlib import Path

from languages.en.evaluation.checkpoint_generation_holdout_v1 import (
    inspect_checkpoint_generation_holdout_v1 as inspect,
)
from languages.en.models.checkpoint import load_checkpoint


_ROOT = Path(__file__).resolve().parents[1]
_CHECKPOINT = _ROOT / "models" / "checkpoints" / "xsus-en-written-v5.json.gz"


class RealCheckpointGenerationSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.checkpoint_hash = hashlib.sha256(_CHECKPOINT.read_bytes()).hexdigest()
        cls.tokenizer, cls.model, cls.revision = load_checkpoint(_CHECKPOINT)
        cls.report = inspect(
            _CHECKPOINT,
            ["Synthetic diagnostic alpha", "Synthetic diagnostic beta"],
            ["unrelated reference alpha", "unrelated reference beta"],
            independent_holdout=True,
            max_new_tokens=1,
        )

    def test_real_checkpoint_revision_matches_bytes(self):
        self.assertEqual(self.revision, "sha256-" + self.checkpoint_hash)
        self.assertEqual(self.report["checkpoint_revision"], self.revision)

    def test_real_checkpoint_runs_all_three_windows(self):
        rows = self.report["generation"]["scoring"]["windows"]
        self.assertEqual(set(rows), {"16", "32", "64"})
        self.assertTrue(all(row["evaluated_cases"] == 2 for row in rows.values()))

    def test_original_checkpoint_context_unchanged(self):
        self.assertEqual(self.report["checkpoint_trained_context_size"],
                         self.model.context_size)
        self.assertFalse(self.report["production_context_changed"])

    def test_checkpoint_bytes_unchanged(self):
        self.assertEqual(hashlib.sha256(_CHECKPOINT.read_bytes()).hexdigest(),
                         self.checkpoint_hash)

    def test_no_training_or_release(self):
        self.assertFalse(self.report["weights_retrained"])
        self.assertFalse(self.report["release_authorized"])
        self.assertFalse(self.report["generation"]["scoring"]["semantic_correctness_proven"])

    def test_no_raw_prompts_in_report(self):
        serialized = json.dumps(self.report, allow_nan=False)
        self.assertNotIn("Synthetic diagnostic alpha", serialized)
        self.assertNotIn("Synthetic diagnostic beta", serialized)
        self.assertNotIn("unrelated reference alpha", serialized)


if __name__ == "__main__":
    unittest.main()
