"""Checkpoint evaluation must use training-time role markers and prompt normalization."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from core.contracts.request import Conversation
from languages.en.models.checkpoint import save_checkpoint
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.text.tokenizer import BytePairTokenizer, BOS, USER, ASSISTANT
from languages.en.text.generation.conversation_format import prompt_tokens
from languages.en.text.normalization.model_input import prepare_model_input
from languages.en.evaluation.checkpoint_generation_holdout_v1 import (
    inspect_checkpoint_generation_holdout_v1,
)


class CheckpointPromptEncodingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "model.gz"
        self.tokenizer = BytePairTokenizer()
        self.model = NeuralLanguageModel.initialize(
            vocab_size=self.tokenizer.vocab_size,
            hidden_size=3, context_size=16, seed=47,
        )

    def inspect_prefixes(self, prompt_format, prompts):
        self.model.prompt_format = prompt_format
        save_checkpoint(self.path, self.tokenizer, self.model)
        with patch(
            "languages.en.evaluation.checkpoint_generation_holdout_v1.inspect_frozen_generation_holdout_v1",
            return_value={"synthetic": True},
        ) as runner:
            inspect_checkpoint_generation_holdout_v1(
                self.path, prompts, ["reference one", "reference two"],
                independent_holdout=True, max_new_tokens=1,
            )
        return runner.call_args.args[2]

    def test_plain_uses_training_role_markers(self):
        prefixes = self.inspect_prefixes("plain", ["Alpha", "Beta"])
        self.assertEqual(prefixes[0], prompt_tokens(self.tokenizer, Conversation("Alpha")))
        self.assertEqual(prefixes[0][0], BOS)
        self.assertEqual(prefixes[0][1], USER)
        self.assertEqual(prefixes[0][-1], ASSISTANT)

    def test_written_v5_uses_checkpoint_normalization(self):
        prompts = ["Write a short greeting.", "Write a short farewell."]
        prefixes = self.inspect_prefixes("written-english-v5", prompts)
        expected = [
            prompt_tokens(self.tokenizer, prepare_model_input(
                Conversation(prompt), "written-english-v5"
            )[0]) for prompt in prompts
        ]
        self.assertEqual(prefixes, expected)

    def test_rewrite_slots_uses_checkpoint_normalization(self):
        prompts = ["Rewrite: hello", "Rewrite: goodbye"]
        prefixes = self.inspect_prefixes("rewrite-slots-v1", prompts)
        expected = [
            prompt_tokens(self.tokenizer, prepare_model_input(
                Conversation(prompt), "rewrite-slots-v1"
            )[0]) for prompt in prompts
        ]
        self.assertEqual(prefixes, expected)

    def test_no_raw_prompt_in_returned_report(self):
        self.model.prompt_format = "plain"
        save_checkpoint(self.path, self.tokenizer, self.model)
        with patch(
            "languages.en.evaluation.checkpoint_generation_holdout_v1.inspect_frozen_generation_holdout_v1",
            return_value={"synthetic": True},
        ):
            report = inspect_checkpoint_generation_holdout_v1(
                self.path, ["PRIVATE_ALPHA", "PRIVATE_BETA"],
                ["reference one", "reference two"],
                independent_holdout=True,
            )
        self.assertNotIn("PRIVATE_ALPHA", str(report))
        self.assertFalse(report["release_authorized"])


if __name__ == "__main__":
    unittest.main()
