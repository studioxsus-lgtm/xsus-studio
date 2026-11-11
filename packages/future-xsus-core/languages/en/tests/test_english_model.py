import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from core.contracts.request import Conversation, ConversationRole, ConversationTurn
from languages.en.data.preparation.corpus import load_corpus, validate_splits
from languages.en.models.checkpoint import load_checkpoint, save_checkpoint
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.text.generation.conversation_format import prompt_tokens
from languages.en.text.tokenizer import ASSISTANT, BOS, EOS, USER, BytePairTokenizer

LANGUAGE_ROOT = Path(__file__).resolve().parents[1]


class EnglishModelTests(unittest.TestCase):
    def test_byte_pair_training_is_deterministic_and_preserves_unseen_unicode(self):
        samples = ("hello hello", "hello there")
        tokenizer = BytePairTokenizer.train(samples, max_merges=12)
        self.assertEqual(tokenizer, BytePairTokenizer.train(reversed(samples), max_merges=12))
        self.assertLess(len(tokenizer.encode("hello")), len("hello"))
        text = "Hello, Shqipëri and 東京!"
        self.assertEqual(tokenizer.decode(tokenizer.encode(text)), text)
        with self.assertRaises(ValueError):
            tokenizer.decode([-1])

    def test_role_markers_preserve_follow_up_order(self):
        tokenizer = BytePairTokenizer()
        history = (
            ConversationTurn(ConversationRole.USER, "First"),
            ConversationTurn(ConversationRole.ASSISTANT, "Answer"),
        )
        self.assertEqual(
            prompt_tokens(tokenizer, Conversation("Next", history)),
            [
                BOS, USER, *tokenizer.encode("First"), ASSISTANT, *tokenizer.encode("Answer"),
                EOS, USER, *tokenizer.encode("Next"), ASSISTANT,
            ],
        )

    def test_training_from_seeded_random_weights_reduces_target_loss(self):
        model = NeuralLanguageModel.initialize(vocab_size=12, hidden_size=6, context_size=3, seed=7)
        initial = model.loss([1, 3], 6)
        original_embedding = model.embeddings[3].copy()
        for _ in range(25):
            model.train_step([1, 3], 6, 0.08)
        self.assertLess(model.loss([1, 3], 6), initial / 2)
        self.assertNotEqual(model.embeddings[3], original_embedding)

    def test_checkpoint_round_trip_and_invalid_artifact(self):
        tokenizer = BytePairTokenizer.train(("hello hello",), max_merges=4)
        model = NeuralLanguageModel.initialize(
            vocab_size=tokenizer.vocab_size, hidden_size=4, context_size=5, seed=23,
        )
        prefix = tokenizer.encode("hello")
        with TemporaryDirectory() as temporary:
            path = Path(temporary) / "model.json.gz"
            save_checkpoint(path, tokenizer, model)
            restored_tokenizer, restored_model, revision = load_checkpoint(path)
            self.assertEqual(restored_tokenizer, tokenizer)
            self.assertEqual(restored_model.context_size, model.context_size)
            self.assertTrue(revision.startswith("sha256-"))
            for expected, actual in zip(model.logits(prefix), restored_model.logits(prefix), strict=True):
                self.assertAlmostEqual(actual, expected, places=6)
            path.write_bytes(b"not a checkpoint")
            with self.assertRaisesRegex(ValueError, "Invalid XSUS checkpoint"):
                load_checkpoint(path)

    def test_original_corpus_is_disjoint_from_held_out_examples(self):
        training = load_corpus(LANGUAGE_ROOT / "data" / "training.jsonl")
        evaluation = load_corpus(LANGUAGE_ROOT / "evaluation" / "conversation.jsonl")
        validate_splits(training, evaluation)
        with self.assertRaisesRegex(ValueError, "overlap"):
            validate_splits(training, (training[0],))
