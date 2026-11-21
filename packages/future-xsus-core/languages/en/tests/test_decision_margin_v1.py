import unittest
from languages.en.evaluation.decision_margin_v1 import inspect_decision_margin_v1 as inspect
from languages.en.text.tokenizer import BYTE_OFFSET


class Tokenizer:
    def decode(self,tokens,errors="replace"):
        return " " if tokens[0]==BYTE_OFFSET else "a"


class Model:
    vocab_size=BYTE_OFFSET+3
    def logits(self,prefix):
        values=[-10.0]*self.vocab_size
        values[BYTE_OFFSET]=3.0+len(prefix)
        values[BYTE_OFFSET+1]=2.0
        values[BYTE_OFFSET+2]=1.0
        return values


class DecisionMarginV1Tests(unittest.TestCase):
    def setUp(self):
        self.model=Model()
        self.tokenizer=Tokenizer()

    def test_cases(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[],[1]])["cases"],2)

    def test_whitespace(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[]])["whitespace_winner_cases"],1)

    def test_mean_margin(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[],[1]])["mean_top_two_margin"],1.5)

    def test_min_margin(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[],[1]])["min_top_two_margin"],1.0)

    def test_max_margin(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[],[1]])["max_top_two_margin"],2.0)

    def test_no_logits(self):
        self.assertFalse(inspect(self.tokenizer,self.model,[[]])["raw_logits_exposed"])

    def test_no_tokens(self):
        self.assertFalse(inspect(self.tokenizer,self.model,[[]])["raw_token_ids_exposed"])

    def test_no_text(self):
        self.assertFalse(inspect(self.tokenizer,self.model,[[]])["raw_text_exposed"])

    def test_reject_empty(self):
        with self.assertRaises(ValueError):
            inspect(self.tokenizer,self.model,[])

    def test_reject_bad_prefix(self):
        with self.assertRaises(ValueError):
            inspect(self.tokenizer,self.model,[[-1]])

    def test_reject_nan(self):
        class Bad(Model):
            def logits(self,prefix):
                result=super().logits(prefix)
                result[BYTE_OFFSET]=float("nan")
                return result
        with self.assertRaises(ValueError):
            inspect(self.tokenizer,Bad(),[[]])

    def test_contract(self):
        self.assertEqual(inspect(self.tokenizer,self.model,[[]])["contract"],"future-xsus-core.decision-margin.v1")
