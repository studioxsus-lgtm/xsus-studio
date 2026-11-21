"""Integration contract: read-only inference sweep embeds decision evidence."""
import unittest
from types import SimpleNamespace
from core.contracts.request import Conversation
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.text.tokenizer import BytePairTokenizer
from languages.en.evaluation.inference_context_counterfactual_v1 import inspect_inference_context_counterfactual_v1 as inspect
from languages.en.evaluation.context_window_decision_v1 import inspect_context_window_decision_v1 as decide

class Case:
    def __init__(self, prompt, response):
        self.example=SimpleNamespace(conversation=Conversation(prompt),response=response)

class ContextWindowDecisionIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tokenizer=BytePairTokenizer()
        cls.model=NeuralLanguageModel.initialize(
            vocab_size=cls.tokenizer.vocab_size,hidden_size=4,context_size=16,seed=17)
        cls.cases=[Case("Identify synthetic marker alpha without repeating the question.","Amber answer."),
                   Case("Identify synthetic marker beta without repeating the question.","Birch answer.")]
        cls.report=inspect(cls.tokenizer,cls.model,cls.cases)
    def test_embedded_decision_present(self):
        self.assertIn("context_window_decision",self.report)
    def test_embedded_decision_matches_direct(self):
        self.assertEqual(self.report["context_window_decision"],decide(self.report))
    def test_embedded_decision_not_authorized(self):
        decision=self.report["context_window_decision"]
        self.assertFalse(decision["training_authorized"])
        self.assertFalse(decision["release_authorized"])
        self.assertFalse(decision["quality_improvement_proven"])
    def test_embedded_comparison_windows(self):
        self.assertEqual(set(self.report["context_window_decision"]["comparisons"]),{"32","64"})
    def test_custom_two_windows_skip_decision(self):
        report=inspect(self.tokenizer,self.model,self.cases,windows=(16,32))
        self.assertNotIn("context_window_decision",report)
    def test_reverse_windows_still_embed_decision(self):
        report=inspect(self.tokenizer,self.model,self.cases,windows=(64,32,16))
        self.assertEqual(report["context_window_decision"],self.report["context_window_decision"])
    def test_model_context_is_unchanged(self):
        self.assertEqual(self.model.context_size,16)
    def test_raw_payload_not_exposed(self):
        decision=self.report["context_window_decision"]
        self.assertFalse(decision["raw_text_exposed"])
        self.assertFalse(decision["raw_token_ids_exposed"])
        self.assertFalse(decision["raw_logits_exposed"])
if __name__=="__main__":
    unittest.main()
