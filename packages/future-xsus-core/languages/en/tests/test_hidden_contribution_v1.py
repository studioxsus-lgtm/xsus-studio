import unittest
from languages.en.evaluation.hidden_contribution_v1 import inspect_hidden_contribution_v1 as inspect
from languages.en.text.tokenizer import BYTE_OFFSET


class Tokenizer:
    def decode(self,tokens,errors="replace"):
        return " " if tokens[0]==BYTE_OFFSET else "a"


class Model:
    vocab_size=BYTE_OFFSET+2
    output_bias=None
    output_weights=None
    def __init__(self):
        self.output_bias=[0.0]*self.vocab_size
        self.output_bias[BYTE_OFFSET+1]=2.0
        self.output_weights=[[0.0] for _ in range(self.vocab_size)]
        self.output_weights[BYTE_OFFSET]=[4.0]
    def _forward(self,prefix):
        hidden=[1.0] if prefix else [0.0]
        logits=[b+row[0]*hidden[0] for b,row in zip(self.output_bias,self.output_weights)]
        return [],hidden,logits


class HiddenContributionV1Tests(unittest.TestCase):
    def setUp(self):
        self.model=Model()
        self.tokenizer=Tokenizer()

    def test_context_switch(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[BYTE_OFFSET]])["context_changed_top_token"],1)

    def test_whitespace(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[BYTE_OFFSET]])["whitespace_context_winners"],1)

    def test_hidden_advantage(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[BYTE_OFFSET]])["mean_hidden_advantage_over_bias_token"],4.0)

    def test_no_context(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[]])["context_changed_top_token"],0)

    def test_bias_top(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[]])["bias_top_category"],"printable")

    def test_cases(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[],[BYTE_OFFSET]])["cases"],2)

    def test_positive_margin(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[BYTE_OFFSET]])["positive_hidden_margin_cases"],1)

    def test_no_raw_text(self):
        self.assertFalse(inspect(self.tokenizer,self.model,[[]])["raw_text_exposed"])

    def test_no_raw_tokens(self):
        self.assertFalse(inspect(self.tokenizer,self.model,[[]])["raw_token_ids_exposed"])

    def test_no_hidden_vectors(self):
        self.assertFalse(inspect(self.tokenizer,self.model,[[]])["hidden_vectors_exposed"])

    def test_reject_empty(self):
        with self.assertRaises(ValueError):
            inspect(self.tokenizer,self.model,[])

    def test_reject_bad_prefix(self):
        with self.assertRaises(ValueError):
            inspect(self.tokenizer,self.model,[[-1]])

    def test_reject_nonfinite(self):
        self.model.output_bias[BYTE_OFFSET]=float("nan")
        with self.assertRaises(ValueError):
            inspect(self.tokenizer,self.model,[[]])

    def test_contract(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[]])["contract"],"future-xsus-core.hidden-contribution.v1")
