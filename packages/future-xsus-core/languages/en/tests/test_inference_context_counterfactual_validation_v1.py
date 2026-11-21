"""Read-only counterfactual contract and invalid-window regression suite."""
import unittest
from types import SimpleNamespace
from core.contracts.request import Conversation
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.text.tokenizer import BytePairTokenizer
from languages.en.evaluation.inference_context_counterfactual_v1 import inspect_inference_context_counterfactual_v1 as inspect

class Case:
    def __init__(self, text, response):
        self.example=SimpleNamespace(conversation=Conversation(text),response=response)

class CounterfactualValidation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tokenizer=BytePairTokenizer()
        cls.model=NeuralLanguageModel.initialize(vocab_size=cls.tokenizer.vocab_size,hidden_size=4,context_size=16,seed=17)
        cls.cases=[Case("Find the synthetic marker alpha without copying the question.","Amber."),
                   Case("Find the synthetic marker beta without copying the question.","Birch.")]
    def test_custom_windows(self):
        self.assertEqual(set(inspect(self.tokenizer,self.model,self.cases,windows=(16,32))["windows"]),{"16","32"})
    def test_reject_boolean_window(self):
        with self.assertRaises(ValueError): inspect(self.tokenizer,self.model,self.cases,windows=(True,))
    def test_reject_negative_window(self):
        with self.assertRaises(ValueError): inspect(self.tokenizer,self.model,self.cases,windows=(-1,))
    def test_reject_oversized_window(self):
        with self.assertRaises(ValueError): inspect(self.tokenizer,self.model,self.cases,windows=(4097,))
    def test_reject_empty_window_list(self):
        with self.assertRaises(ValueError): inspect(self.tokenizer,self.model,self.cases,windows=())
    def test_reject_single_case(self):
        with self.assertRaises(ValueError): inspect(self.tokenizer,self.model,self.cases[:1])
    def test_repeatability(self):
        a=inspect(self.tokenizer,self.model,self.cases,windows=(16,32))
        b=inspect(self.tokenizer,self.model,self.cases,windows=(16,32))
        self.assertEqual(a,b)
    def test_weights_unchanged(self):
        before=[list(row) for row in self.model.embedding]
        inspect(self.tokenizer,self.model,self.cases,windows=(16,32))
        self.assertEqual(self.model.embedding,before)
    def test_aggregate_contract(self):
        report=inspect(self.tokenizer,self.model,self.cases,windows=(16,32))
        self.assertEqual(report["cases"],2)
        self.assertFalse(report["release_authorized"])
        self.assertFalse(report["weights_retrained"])
        self.assertFalse(report["production_context_changed"])
if __name__=="__main__": unittest.main()
