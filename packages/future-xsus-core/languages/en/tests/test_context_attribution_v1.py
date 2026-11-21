import unittest
from languages.en.evaluation.context_attribution_v1 import inspect_context_attribution_v1 as inspect
from languages.en.text.tokenizer import BYTE_OFFSET


class Tokenizer:
    def decode(self,tokens,errors="replace"):
        return " " if tokens[0]==BYTE_OFFSET else "a"


class Model:
    vocab_size=BYTE_OFFSET+2
    def __init__(self):
        self.output_bias=[0.0]*self.vocab_size
        self.output_bias[BYTE_OFFSET+1]=3.0
    def logits(self,prompt):
        values=self.output_bias[:]
        if prompt:
            values[BYTE_OFFSET]=5.0
        return values


class ContextAttributionV1Tests(unittest.TestCase):
    def setUp(self):
        self.model=Model()
        self.tokenizer=Tokenizer()

    def test_context_changes_category(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[BYTE_OFFSET]])["context_category_differs_from_bias"],1)

    def test_context_whitespace(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[BYTE_OFFSET]])["whitespace_context_winners"],1)

    def test_no_context_keeps_bias(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[]])["context_winner_differs_from_bias"],0)

    def test_multiple_cases(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[],[BYTE_OFFSET]])["cases"],2)

    def test_margin(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[BYTE_OFFSET]])["mean_winner_advantage_over_bias"],2.0)

    def test_bias_category(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[]])["bias_top_category"],"printable")

    def test_no_raw_text(self):
        self.assertFalse(inspect(self.tokenizer,self.model,[[]])["raw_text_exposed"])

    def test_no_raw_ids(self):
        self.assertFalse(inspect(self.tokenizer,self.model,[[]])["raw_token_ids_exposed"])

    def test_no_hidden_vectors(self):
        self.assertFalse(inspect(self.tokenizer,self.model,[[]])["hidden_vectors_exposed"])

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            inspect(self.tokenizer,self.model,[])

    def test_invalid_prompt(self):
        with self.assertRaises(ValueError):
            inspect(self.tokenizer,self.model,[[-1]])

    def test_invalid_bias(self):
        self.model.output_bias[BYTE_OFFSET]=float("nan")
        with self.assertRaises(ValueError):
            inspect(self.tokenizer,self.model,[[]])

    def test_contract(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[]])["contract"],"future-xsus-core.context-attribution.v1")
