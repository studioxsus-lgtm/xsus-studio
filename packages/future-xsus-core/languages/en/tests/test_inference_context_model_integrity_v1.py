"""Check that read-only context sweeps preserve every trained parameter."""
from copy import deepcopy
from types import SimpleNamespace
import unittest
from core.contracts.request import Conversation
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.text.tokenizer import BytePairTokenizer
from languages.en.evaluation.inference_context_counterfactual_v1 import inspect_inference_context_counterfactual_v1 as inspect

class Case:
    def __init__(self,text,response):
        self.example=SimpleNamespace(conversation=Conversation(text),response=response)

class CounterfactualModelIntegrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tokenizer=BytePairTokenizer()
        cls.cases=[Case("Find synthetic marker 0 without copying the prompt.","Amber answer."),
                   Case("Find synthetic marker 1 without copying the prompt.","Birch answer.")]
    def setUp(self):
        self.model=NeuralLanguageModel.initialize(
            vocab_size=self.tokenizer.vocab_size,hidden_size=4,context_size=16,seed=17)
    def test_full_model_unchanged_after_sweep(self):
        before=deepcopy(self.model)
        inspect(self.tokenizer,self.model,self.cases,windows=(16,32,64))
        self.assertEqual(self.model,before)
    def test_full_model_unchanged_after_repeated_sweeps(self):
        before=deepcopy(self.model)
        for _ in range(2):
            inspect(self.tokenizer,self.model,self.cases,windows=(16,32))
        self.assertEqual(self.model,before)
    def test_window_order_preserves_per_window_results(self):
        forward=inspect(self.tokenizer,self.model,self.cases,windows=(16,32,64))
        reverse=inspect(self.tokenizer,self.model,self.cases,windows=(64,32,16))
        self.assertEqual(forward["windows"],reverse["windows"])
    def test_window_count_matches_requested_sizes(self):
        report=inspect(self.tokenizer,self.model,self.cases,windows=(8,16,32,64))
        self.assertEqual(len(report["windows"]),4)
    def test_read_only_flags_for_each_window_set(self):
        for windows in ((16,),(16,32),(16,32,64)):
            with self.subTest(windows=windows):
                report=inspect(self.tokenizer,self.model,self.cases,windows=windows)
                self.assertFalse(report["weights_retrained"])
                self.assertFalse(report["production_context_changed"])
                self.assertFalse(report["release_authorized"])
    def test_aggregate_rank_is_bounded(self):
        report=inspect(self.tokenizer,self.model,self.cases,windows=(16,32,64))
        for window in report["windows"].values():
            self.assertGreaterEqual(window["mean_first_target_rank"],1)
            self.assertLessEqual(window["mean_first_target_rank"],self.model.vocab_size)
            self.assertGreaterEqual(window["mean_best_to_target_logit_gap"],0)
    def test_no_raw_payload_keys(self):
        report=inspect(self.tokenizer,self.model,self.cases,windows=(16,32))
        for window in report["windows"].values():
            self.assertFalse({"raw_text","raw_logits","token_ids","responses"} & set(window))
if __name__=="__main__": unittest.main()
