"""Cross-check context-window diagnostics without retraining or changing production."""
import unittest
from types import SimpleNamespace

from core.contracts.request import Conversation
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.text.tokenizer import BytePairTokenizer
from languages.en.evaluation.inference_context_counterfactual_v1 import (
    inspect_inference_context_counterfactual_v1 as inspect,
)

class Case:
    def __init__(self, prompt, response):
        self.example=SimpleNamespace(conversation=Conversation(prompt),response=response)

class ContextReportConsistency(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tokenizer=BytePairTokenizer()
        cls.model=NeuralLanguageModel.initialize(
            vocab_size=cls.tokenizer.vocab_size,hidden_size=4,context_size=16,seed=17)
        cls.cases=[
            Case("Identify synthetic marker zero without copying the question.","Amber answer."),
            Case("Identify synthetic marker one without copying the question.","Birch answer."),
            Case("Identify synthetic marker two without copying the question.","Cedar answer."),
        ]
        cls.report=inspect(cls.tokenizer,cls.model,cls.cases,windows=(16,32,64))

    def test_case_count_is_consistent(self):
        self.assertEqual(self.report["cases"],len(self.cases))

    def test_window_case_counts_are_consistent(self):
        for window in self.report["windows"].values():
            self.assertEqual(window["first_target_cases"],len(self.cases))

    def test_top_one_count_is_bounded(self):
        for window in self.report["windows"].values():
            self.assertGreaterEqual(window["first_target_top_one_correct"],0)
            self.assertLessEqual(window["first_target_top_one_correct"],len(self.cases))

    def test_preference_count_is_bounded(self):
        for window in self.report["windows"].values():
            self.assertGreaterEqual(window["matched_target_preferred_cases"],0)
            self.assertLessEqual(window["matched_target_preferred_cases"],len(self.cases))

    def test_greedy_changes_are_bounded(self):
        for window in self.report["windows"].values():
            self.assertGreaterEqual(window["greedy_winner_changed_cases"],0)
            self.assertLessEqual(window["greedy_winner_changed_cases"],len(self.cases))

    def test_collisions_are_bounded(self):
        for window in self.report["windows"].values():
            self.assertGreaterEqual(window["colliding_cases"],0)
            self.assertLessEqual(window["colliding_cases"],len(self.cases))
            self.assertGreaterEqual(window["distinct_context_windows"],1)
            self.assertLessEqual(window["distinct_context_windows"],len(self.cases))

    def test_rank_and_gap_are_nonnegative(self):
        for window in self.report["windows"].values():
            self.assertGreaterEqual(window["mean_first_target_rank"],1)
            self.assertGreaterEqual(window["mean_best_to_target_logit_gap"],0)

    def test_no_release_or_training_claims(self):
        self.assertFalse(self.report["weights_retrained"])
        self.assertFalse(self.report["production_context_changed"])
        self.assertFalse(self.report["release_authorized"])

    def test_no_raw_example_payload(self):
        self.assertFalse(self.report["raw_text_exposed"])
        self.assertFalse(self.report["raw_token_ids_exposed"])
        for window in self.report["windows"].values():
            self.assertNotIn("responses",window)
            self.assertNotIn("raw_logits",window)
            self.assertNotIn("token_ids",window)

if __name__=="__main__":
    unittest.main()
