import unittest
from unittest.mock import patch
from core.contracts.request import Conversation
from languages.en.text.generation.generate import generate
from languages.en.text.tokenizer import BYTE_OFFSET, EOS


class Tokenizer:
    def decode(self,tokens,errors="replace"):
        return "".join(" " if t==BYTE_OFFSET else "A" for t in tokens)


class Model:
    prompt_format="plain"
    context_size=8
    vocab_size=BYTE_OFFSET+2
    def __init__(self):
        self.output_bias=[-10.0]*self.vocab_size
        self.output_bias[EOS]=-9.0
        self.output_bias[BYTE_OFFSET]=0.0
        self.output_bias[BYTE_OFFSET+1]=2.0
        self.output_weights=[[0.0] for _ in range(self.vocab_size)]
        self.output_weights[BYTE_OFFSET]=[5.0]
    def _forward(self,prefix):
        hidden=[1.0]
        logits=[bias+row[0] for row,bias in zip(self.output_weights,self.output_bias)]
        return [],hidden,logits
    def logits(self,prefix):
        return self._forward(prefix)[2]


class HiddenContributionScalingV1Tests(unittest.TestCase):
    def setUp(self):
        self.model=Model()
        self.tokenizer=Tokenizer()

    def run_generation(self,**kwargs):
        with patch("languages.en.text.generation.generate.prompt_tokens",return_value=[BYTE_OFFSET]):
            return generate(self.tokenizer,self.model,Conversation("hello"),max_new_tokens=4,**kwargs)

    def test_default_is_whitespace(self):
        self.assertEqual(self.run_generation(),"")

    def test_scale_one_matches_default(self):
        self.assertEqual(self.run_generation(hidden_contribution_scale=1.0),"")

    def test_zero_scale_uses_bias(self):
        self.assertEqual(self.run_generation(hidden_contribution_scale=0.0),"AAAA")

    def test_half_scale_prefers_whitespace(self):
        self.assertEqual(self.run_generation(hidden_contribution_scale=0.5),"")

    def test_quarter_scale_prefers_printable(self):
        self.assertEqual(self.run_generation(hidden_contribution_scale=0.25),"AAAA")

    def test_reject_negative(self):
        with self.assertRaises(ValueError):
            self.run_generation(hidden_contribution_scale=-0.1)

    def test_reject_above_one(self):
        with self.assertRaises(ValueError):
            self.run_generation(hidden_contribution_scale=1.1)

    def test_reject_nan(self):
        with self.assertRaises(ValueError):
            self.run_generation(hidden_contribution_scale=float("nan"))

    def test_reject_infinity(self):
        with self.assertRaises(ValueError):
            self.run_generation(hidden_contribution_scale=float("inf"))

    def test_reject_boolean(self):
        with self.assertRaises(ValueError):
            self.run_generation(hidden_contribution_scale=True)

    def test_stop_respected(self):
        from threading import Event
        stop=Event()
        stop.set()
        self.assertEqual(self.run_generation(hidden_contribution_scale=0.0,stop=stop),"")
