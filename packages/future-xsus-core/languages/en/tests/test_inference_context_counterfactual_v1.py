import unittest
from unittest.mock import patch
from types import SimpleNamespace
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.text.tokenizer import BytePairTokenizer
from core.contracts.request import Conversation
from languages.en.evaluation.inference_context_counterfactual_v1 import inspect_inference_context_counterfactual_v1 as inspect


class Case:
    def __init__(self,text,response):
        self.example=SimpleNamespace(conversation=Conversation(text),response=response)


class InferenceContextCounterfactualTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tokenizer=BytePairTokenizer()
        cls.model=NeuralLanguageModel.initialize(vocab_size=cls.tokenizer.vocab_size,
            hidden_size=4,context_size=16,seed=17)
        cls.cases=[Case("Identify synthetic marker 0 without repeating the prompt.","Amber answer."),
                   Case("Identify synthetic marker 1 without repeating the prompt.","Birch answer.")]

    def test_windows(self):
        self.assertEqual(set(inspect(self.tokenizer,self.model,self.cases)["windows"]),{"16","32","64"})

    def test_collisions_at_sixteen(self):
        self.assertEqual(inspect(self.tokenizer,self.model,self.cases)["windows"]["16"]["distinct_context_windows"],1)

    def test_distinct_at_thirty_two(self):
        self.assertEqual(inspect(self.tokenizer,self.model,self.cases)["windows"]["32"]["distinct_context_windows"],2)

    def test_first_target_count(self):
        self.assertEqual(inspect(self.tokenizer,self.model,self.cases)["windows"]["32"]["first_target_cases"],2)

    def test_original_model_unchanged(self):
        inspect(self.tokenizer,self.model,self.cases)
        self.assertEqual(self.model.context_size,16)

    def test_no_retraining(self):
        self.assertFalse(inspect(self.tokenizer,self.model,self.cases)["weights_retrained"])

    def test_no_production_change(self):
        self.assertFalse(inspect(self.tokenizer,self.model,self.cases)["production_context_changed"])

    def test_no_release(self):
        self.assertFalse(inspect(self.tokenizer,self.model,self.cases)["release_authorized"])

    def test_no_text(self):
        self.assertFalse(inspect(self.tokenizer,self.model,self.cases)["raw_text_exposed"])

    def test_no_ids(self):
        self.assertFalse(inspect(self.tokenizer,self.model,self.cases)["raw_token_ids_exposed"])

    def test_invalid_cases(self):
        with self.assertRaises(ValueError):
            inspect(self.tokenizer,self.model,self.cases[:1])

    def test_invalid_windows(self):
        with self.assertRaises(ValueError):
            inspect(self.tokenizer,self.model,self.cases,windows=(0,))

    def test_duplicate_windows(self):
        with self.assertRaises(ValueError):
            inspect(self.tokenizer,self.model,self.cases,windows=(16,16))

    def test_contract(self):
        self.assertEqual(inspect(self.tokenizer,self.model,self.cases)["contract"],
                         "future-xsus-core.inference-context-counterfactual.v1")
