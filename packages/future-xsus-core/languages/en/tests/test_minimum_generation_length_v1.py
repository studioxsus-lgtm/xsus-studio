"""Tests for opt-in EOS suppression during minimum-length generation."""
import unittest
from unittest.mock import patch

from core.contracts.request import Conversation
from languages.en.text.generation.generate import generate
from languages.en.text.tokenizer import BYTE_OFFSET, EOS


class FakeTokenizer:
    def decode(self, tokens, errors="replace"):
        return "".join("a" if token==BYTE_OFFSET else "b" for token in tokens)


class FakeModel:
    prompt_format="plain"
    context_size=16
    vocab_size=BYTE_OFFSET+2

    def logits(self,prefix):
        values=[-10.0]*self.vocab_size
        values[EOS]=10.0
        values[BYTE_OFFSET]=9.0
        values[BYTE_OFFSET+1]=8.0
        return values


class MinimumGenerationLengthV1Tests(unittest.TestCase):
    def setUp(self):
        self.tokenizer=FakeTokenizer()
        self.model=FakeModel()
        self.prompt=Conversation("Say something")

    def _generate(self,**kwargs):
        with patch("languages.en.text.generation.generate.prompt_tokens",return_value=[BYTE_OFFSET]):
            return generate(self.tokenizer,self.model,self.prompt,**kwargs)

    def test_default_preserves_eos(self):
        self.assertEqual(self._generate(max_new_tokens=8),"")

    def test_explicit_zero_preserves_eos(self):
        self.assertEqual(self._generate(max_new_tokens=8,min_new_tokens=0),"")

    def test_minimum_one(self):
        self.assertEqual(self._generate(max_new_tokens=8,min_new_tokens=1),"a")

    def test_minimum_four(self):
        self.assertEqual(self._generate(max_new_tokens=8,min_new_tokens=4),"aaaa")

    def test_minimum_at_maximum(self):
        self.assertEqual(self._generate(max_new_tokens=4,min_new_tokens=4),"aaaa")

    def test_reject_negative(self):
        with self.assertRaises(ValueError):
            self._generate(max_new_tokens=4,min_new_tokens=-1)

    def test_reject_above_max(self):
        with self.assertRaises(ValueError):
            self._generate(max_new_tokens=4,min_new_tokens=5)

    def test_reject_float(self):
        with self.assertRaises(ValueError):
            self._generate(max_new_tokens=4,min_new_tokens=1.0)

    def test_reject_boolean(self):
        with self.assertRaises(ValueError):
            self._generate(max_new_tokens=4,min_new_tokens=True)

    def test_stop_remains_respected(self):
        from threading import Event
        stop=Event()
        stop.set()
        self.assertEqual(self._generate(max_new_tokens=8,min_new_tokens=4,stop=stop),"")

    def test_minimum_visible_one(self):
        self.assertEqual(self._generate(max_new_tokens=8,min_visible_chars=1),"a")

    def test_minimum_visible_four(self):
        self.assertEqual(self._generate(max_new_tokens=8,min_visible_chars=4),"aaaa")

    def test_minimum_visible_default_unchanged(self):
        self.assertEqual(self._generate(max_new_tokens=8,min_visible_chars=0),"")

    def test_reject_negative_visible(self):
        with self.assertRaises(ValueError):
            self._generate(max_new_tokens=8,min_visible_chars=-1)

    def test_reject_float_visible(self):
        with self.assertRaises(ValueError):
            self._generate(max_new_tokens=8,min_visible_chars=1.0)

    def test_reject_visible_above_max(self):
        with self.assertRaises(ValueError):
            self._generate(max_new_tokens=8,min_visible_chars=9)

    def test_stop_respected_with_visible_requirement(self):
        from threading import Event
        stop=Event()
        stop.set()
        self.assertEqual(self._generate(max_new_tokens=8,min_visible_chars=4,stop=stop),"")

    def test_visible_first_keeps_default_eos(self):
        self.assertEqual(self._generate(max_new_tokens=8,avoid_leading_whitespace=True),"")

    def test_visible_first_with_minimum_one(self):
        self.tokenizer.decode=lambda tokens,errors="replace": " " if tokens == [BYTE_OFFSET] else "b"
        self.assertEqual(self._generate(max_new_tokens=8,min_new_tokens=1,avoid_leading_whitespace=True),"b")

    def test_visible_first_with_minimum_visible(self):
        self.tokenizer.decode=lambda tokens,errors="replace": " " if tokens == [BYTE_OFFSET] else "b"
        self.assertEqual(self._generate(max_new_tokens=8,min_visible_chars=1,avoid_leading_whitespace=True),"b")

    def test_visible_first_rejects_non_boolean(self):
        with self.assertRaises(ValueError):
            self._generate(max_new_tokens=8,avoid_leading_whitespace=1)

    def test_visible_first_does_not_change_default(self):
        self.assertEqual(self._generate(max_new_tokens=8,min_new_tokens=1),"a")
