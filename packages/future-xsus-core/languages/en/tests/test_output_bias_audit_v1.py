import unittest
from languages.en.evaluation.output_bias_audit_v1 import inspect_output_bias_v1 as inspect
from languages.en.text.tokenizer import BYTE_OFFSET, EOS


class Tokenizer:
    def decode(self,tokens,errors="replace"):
        return " " if tokens[0]==BYTE_OFFSET else "a"


class Model:
    vocab_size=BYTE_OFFSET+2
    def __init__(self):
        self.output_bias=[0.0]*self.vocab_size
        self.output_bias[BYTE_OFFSET]=5.0
        self.output_bias[BYTE_OFFSET+1]=3.0
    def logits(self,prefix):
        return self.output_bias[:]


class OutputBiasAuditV1Tests(unittest.TestCase):
    def test_bias_top_whitespace(self):
        self.assertEqual(inspect(Tokenizer(),Model())["bias_top_category"],"whitespace")

    def test_empty_context_whitespace(self):
        self.assertEqual(inspect(Tokenizer(),Model())["empty_context_top_category"],"whitespace")

    def test_matching_top(self):
        self.assertTrue(inspect(Tokenizer(),Model())["bias_top_matches_empty_context"])

    def test_printable_top(self):
        model=Model()
        model.output_bias[BYTE_OFFSET+1]=6.0
        self.assertEqual(inspect(Tokenizer(),model)["bias_top_category"],"printable")

    def test_eos_preference(self):
        model=Model()
        model.output_bias[EOS]=6.0
        self.assertTrue(inspect(Tokenizer(),model)["eos_bias_exceeds_best_generated"])

    def test_no_eos_preference(self):
        self.assertFalse(inspect(Tokenizer(),Model())["eos_bias_exceeds_best_generated"])

    def test_no_raw_text(self):
        self.assertFalse(inspect(Tokenizer(),Model())["raw_text_exposed"])

    def test_no_token_ids(self):
        self.assertFalse(inspect(Tokenizer(),Model())["raw_token_ids_exposed"])

    def test_invalid_bias(self):
        model=Model()
        model.output_bias=[]
        with self.assertRaises(ValueError):
            inspect(Tokenizer(),model)

    def test_nonfinite(self):
        model=Model()
        model.output_bias[BYTE_OFFSET]=float("nan")
        with self.assertRaises(ValueError):
            inspect(Tokenizer(),model)

    def test_contract(self):
        self.assertEqual(inspect(Tokenizer(),Model())["contract"],"future-xsus-core.output-bias-audit.v1")
