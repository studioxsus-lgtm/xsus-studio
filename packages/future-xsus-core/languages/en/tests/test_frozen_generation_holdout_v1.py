"""Tests for frozen, deterministic 16/32/64 greedy generation."""
import json
import unittest
from copy import deepcopy
from languages.en.text.tokenizer import BytePairTokenizer, BYTE_OFFSET, EOS
from languages.en.evaluation.frozen_generation_holdout_v1 import inspect_frozen_generation_holdout_v1 as run

class FixedModel:
    def __init__(self, vocab_size, token=EOS):
        self.vocab_size=vocab_size
        self.context_size=16
        self.token=token
    def logits(self, prefix):
        values=[-1.0]*self.vocab_size
        values[self.token]=10.0
        return values

class FrozenGenerationHoldoutTests(unittest.TestCase):
    def setUp(self):
        self.tokenizer=BytePairTokenizer()
        self.model=FixedModel(self.tokenizer.vocab_size)
        self.prefixes=[[BYTE_OFFSET+65],[BYTE_OFFSET+66]]
        self.references=["A","B"]
    def evaluate(self, **kwargs):
        return run(self.tokenizer,self.model,self.prefixes,self.references,
                   independent_holdout=True,**kwargs)
    def test_eos_produces_empty_responses(self):
        result=self.evaluate()
        for row in result["scoring"]["windows"].values():
            self.assertEqual(row["empty_responses"],2)
            self.assertEqual(row["accepted_responses"],0)
    def test_generated_byte_is_exact_matched(self):
        self.model.token=BYTE_OFFSET+65
        self.references=["A","A"]
        result=self.evaluate(max_new_tokens=1)
        for row in result["scoring"]["windows"].values():
            self.assertEqual(row["accepted_responses"],2)
    def test_model_unchanged(self):
        before=deepcopy(self.model)
        self.evaluate()
        self.assertEqual(self.model.__dict__,before.__dict__)
    def test_deterministic(self):
        self.assertEqual(self.evaluate(),self.evaluate())
    def test_no_release_authorization(self):
        result=self.evaluate()
        self.assertFalse(result["release_authorized"])
        self.assertFalse(result["scoring"]["comparison"]["training_authorized"])
    def test_no_raw_text_exposed(self):
        self.references=["PRIVATE_REFERENCE_ALPHA","PRIVATE_REFERENCE_BETA"]
        serialized=json.dumps(self.evaluate())
        self.assertNotIn("PRIVATE_REFERENCE_ALPHA",serialized)
        self.assertNotIn("PRIVATE_REFERENCE_BETA",serialized)
    def test_holdout_required(self):
        with self.assertRaises(ValueError):
            run(self.tokenizer,self.model,self.prefixes,self.references)
    def test_invalid_generation_length(self):
        for length in (0,-1,257,True,1.5,"4"):
            with self.subTest(length=length),self.assertRaises(ValueError):
                self.evaluate(max_new_tokens=length)
    def test_invalid_prefix_rejected(self):
        self.prefixes[0]=[True]
        with self.assertRaises(ValueError): self.evaluate()
    def test_invalid_logits_rejected(self):
        self.model.token=99999
        with self.assertRaises((IndexError,ValueError)): self.evaluate()
    def test_model_vocab_mismatch_rejected(self):
        self.model.vocab_size-=1
        with self.assertRaises(ValueError): self.evaluate()
    def test_strict_json_roundtrip(self):
        result=self.evaluate()
        self.assertEqual(json.loads(json.dumps(result,allow_nan=False)),result)
if __name__=="__main__":
    unittest.main()
