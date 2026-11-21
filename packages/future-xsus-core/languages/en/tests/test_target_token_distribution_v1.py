import unittest
from languages.en.evaluation.target_token_distribution_v1 import summarize_target_tokens_v1 as summarize
from languages.en.text.tokenizer import BYTE_OFFSET, EOS


class Tokenizer:
    def decode(self,tokens,errors="replace"):
        return " " if tokens[0]==BYTE_OFFSET else "a"


class TargetTokenDistributionV1Tests(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(summarize(Tokenizer(),[])["target_tokens"],0)

    def test_counts(self):
        result=summarize(Tokenizer(),[([], [BYTE_OFFSET,BYTE_OFFSET+1,EOS])])
        self.assertEqual(result["whitespace_tokens"],1)
        self.assertEqual(result["printable_tokens"],1)
        self.assertEqual(result["eos_tokens"],1)

    def test_total(self):
        result=summarize(Tokenizer(),[([], [BYTE_OFFSET,EOS]),([], [EOS])])
        self.assertEqual(result["target_tokens"],3)

    def test_examples(self):
        self.assertEqual(summarize(Tokenizer(),[([],[]),([],[])])["examples"],2)

    def test_share(self):
        self.assertEqual(summarize(Tokenizer(),[([], [BYTE_OFFSET,EOS])])["whitespace_share"],0.5)

    def test_no_raw(self):
        self.assertFalse(summarize(Tokenizer(),[([], [BYTE_OFFSET])])["raw_token_ids_exposed"])

    def test_no_text(self):
        self.assertFalse(summarize(Tokenizer(),[([], [BYTE_OFFSET])])["raw_text_exposed"])

    def test_reject_non_sequence(self):
        with self.assertRaises(ValueError):
            summarize(Tokenizer(),"bad")

    def test_reject_malformed(self):
        with self.assertRaises(ValueError):
            summarize(Tokenizer(),[[]])

    def test_reject_non_int(self):
        with self.assertRaises(ValueError):
            summarize(Tokenizer(),[([],["a"])])

    def test_contract(self):
        self.assertEqual(summarize(Tokenizer(),[])["contract"],"future-xsus-core.target-token-distribution.v1")
