"""Integration with the real NeuralLanguageModel class, not a synthetic stub.

The initialized model here is untrained. Passing this suite does not establish
answer quality or performance of a trained checkpoint.
"""
import json
import unittest
from copy import deepcopy
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.text.tokenizer import BytePairTokenizer
from languages.en.evaluation.frozen_generation_holdout_v1 import (
    inspect_frozen_generation_holdout_v1 as inspect,
)


class FrozenNeuralIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tokenizer = BytePairTokenizer()
        cls.model = NeuralLanguageModel.initialize(
            vocab_size=cls.tokenizer.vocab_size,
            hidden_size=4, context_size=16, seed=23,
        )
        cls.prefixes = [
            cls.tokenizer.encode("Answer alpha:"),
            cls.tokenizer.encode("Answer beta:"),
        ]
        cls.references = ["alpha", "beta"]

    def evaluate(self, **kwargs):
        return inspect(
            self.tokenizer, self.model, self.prefixes, self.references,
            independent_holdout=True, max_new_tokens=3, **kwargs,
        )

    def test_real_neural_model_runs_three_windows(self):
        result = self.evaluate()
        self.assertEqual(set(result["scoring"]["windows"]), {"16", "32", "64"})
        self.assertEqual(result["cases"], 2)

    def test_neural_model_is_not_mutated(self):
        before = deepcopy(self.model)
        self.evaluate()
        self.assertEqual(self.model, before)

    def test_context_size_remains_sixteen(self):
        self.evaluate()
        self.assertEqual(self.model.context_size, 16)

    def test_repeatability(self):
        self.assertEqual(self.evaluate(), self.evaluate())

    def test_exact_match_is_not_semantic_quality(self):
        result = self.evaluate()
        self.assertFalse(result["scoring"]["semantic_correctness_proven"])
        self.assertFalse(result["scoring"]["comparison"]["quality_improvement_proven"])

    def test_no_training_or_release_authorization(self):
        result = self.evaluate()
        self.assertFalse(result["weights_retrained"])
        self.assertFalse(result["production_context_changed"])
        self.assertFalse(result["release_authorized"])
        self.assertFalse(result["scoring"]["comparison"]["training_authorized"])

    def test_privacy_preserved_in_json(self):
        result = self.evaluate()
        serialized = json.dumps(result, allow_nan=False)
        self.assertNotIn("Answer alpha:", serialized)
        self.assertNotIn("Answer beta:", serialized)
        self.assertNotIn('"raw_logits":', serialized)

    def test_different_reference_does_not_change_model(self):
        before = deepcopy(self.model)
        inspect(
            self.tokenizer, self.model, self.prefixes,
            ["unrelated reference one", "unrelated reference two"],
            independent_holdout=True, max_new_tokens=2,
        )
        self.assertEqual(self.model, before)


if __name__ == "__main__":
    unittest.main()
