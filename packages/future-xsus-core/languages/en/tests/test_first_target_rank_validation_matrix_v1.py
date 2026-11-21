"""Validation matrix for frozen first-token ranking diagnostics."""
import unittest
from languages.en.evaluation.first_target_rank_v1 import inspect_first_target_rank_v1 as inspect
from languages.en.text.tokenizer import BYTE_OFFSET as B

class Model:
    vocab_size=B+4
    def __init__(self, scores=(4.,3.,2.,1.)):
        self.scores=scores
    def logits(self, prefix):
        return [-100.] * B + list(self.scores)

class ValidationMatrix(unittest.TestCase):
    def test_first_candidate(self):
        self.assertEqual(inspect(Model(), [[]], [B])["mean_target_rank"],1)
    def test_second_candidate(self):
        self.assertEqual(inspect(Model(), [[]], [B+1])["mean_target_rank"],2)
    def test_last_candidate(self):
        self.assertEqual(inspect(Model(), [[]], [B+3])["mean_target_rank"],4)
    def test_mixed_mean_rank(self):
        self.assertEqual(inspect(Model(), [[],[]], [B,B+3])["mean_target_rank"],2.5)
    def test_mixed_mean_gap(self):
        self.assertEqual(inspect(Model(), [[],[]], [B,B+3])["mean_best_to_target_logit_gap"],1.5)
    def test_max_gap(self):
        self.assertEqual(inspect(Model(), [[],[]], [B,B+3])["max_best_to_target_logit_gap"],3)
    def test_reject_bool_target(self):
        with self.assertRaises(ValueError): inspect(Model(), [[]], [True])
    def test_reject_bool_prefix(self):
        with self.assertRaises(ValueError): inspect(Model(), [[True]], [B])
    def test_reject_out_of_range_prefix(self):
        with self.assertRaises(ValueError): inspect(Model(), [[B+4]], [B])
    def test_reject_reserved_target(self):
        with self.assertRaises(ValueError): inspect(Model(), [[]], [B-1])
    def test_reject_short_logits(self):
        class Bad(Model):
            def logits(self,prefix): return [0.]
        with self.assertRaises(ValueError): inspect(Bad(), [[]], [B])
    def test_deterministic(self):
        self.assertEqual(inspect(Model(), [[]], [B]),inspect(Model(), [[]], [B]))
if __name__=="__main__": unittest.main()
