import unittest
from unittest.mock import patch
from core.contracts.request import Conversation
from languages.en.evaluation.token_choice_diagnostics_v1 import inspect_token_choices_v1 as inspect
from languages.en.text.tokenizer import BYTE_OFFSET, EOS


class FakeTokenizer:
    def decode(self,ids,errors="replace"):
        return " " if ids[0]==BYTE_OFFSET else "A"


class FakeModel:
    prompt_format="plain"
    context_size=8
    vocab_size=BYTE_OFFSET+2
    def logits(self,prefix):
        logits=[-100.0]*self.vocab_size
        logits[EOS]=10
        logits[BYTE_OFFSET]=9
        logits[BYTE_OFFSET+1]=8
        return logits


class TokenChoiceDiagnosticsV1Tests(unittest.TestCase):
    def setUp(self):
        self.tokenizer=FakeTokenizer()
        self.model=FakeModel()
        self.prompt=Conversation("hello")

    def inspect(self,**kwargs):
        with patch("languages.en.evaluation.token_choice_diagnostics_v1.prompt_tokens",return_value=[BYTE_OFFSET]):
            return inspect(self.tokenizer,self.model,self.prompt,**kwargs)

    def test_steps(self):
        self.assertEqual(self.inspect(steps=5)["steps"],5)

    def test_whitespace(self):
        self.assertEqual(self.inspect(steps=5)["whitespace_token_steps"],5)

    def test_eos_preference(self):
        self.assertEqual(self.inspect(steps=5)["eos_preferred_steps"],5)

    def test_no_printable(self):
        self.assertEqual(self.inspect(steps=5)["printable_token_steps"],0)

    def test_distinct(self):
        self.assertEqual(self.inspect(steps=5)["distinct_token_count"],1)

    def test_no_raw_tokens(self):
        self.assertFalse(self.inspect(steps=2)["raw_token_ids_exposed"])

    def test_no_raw_text(self):
        self.assertNotIn("hello",str(self.inspect(steps=2)))

    def test_invalid_zero(self):
        with self.assertRaises(ValueError):
            self.inspect(steps=0)

    def test_invalid_float(self):
        with self.assertRaises(ValueError):
            self.inspect(steps=1.5)

    def test_invalid_bool(self):
        with self.assertRaises(ValueError):
            self.inspect(steps=True)

    def test_invalid_large(self):
        with self.assertRaises(ValueError):
            self.inspect(steps=257)

    def test_contract(self):
        self.assertEqual(self.inspect(steps=1)["contract"],"future-xsus-core.token-choice-diagnostics.v1")
