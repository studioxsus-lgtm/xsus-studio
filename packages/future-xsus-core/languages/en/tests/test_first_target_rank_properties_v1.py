"""Property-style deterministic ranking checks over frozen logits."""
import unittest
from languages.en.evaluation.first_target_rank_v1 import inspect_first_target_rank_v1 as inspect
from languages.en.text.tokenizer import BYTE_OFFSET as B

class FixedModel:
    vocab_size=B+5
    def __init__(self,scores): self.scores=scores
    def logits(self,prefix): return [-100.0]*B+list(self.scores)

class RankingProperties(unittest.TestCase):
    def test_all_distinct_target_positions(self):
        model=FixedModel([5.,4.,3.,2.,1.])
        for index in range(5):
            with self.subTest(index=index):
                result=inspect(model,[[]],[B+index])
                self.assertEqual(result["mean_target_rank"],index+1)
                self.assertEqual(result["mean_best_to_target_logit_gap"],index)
    def test_common_logit_offset_does_not_change_rank_or_gap(self):
        a=inspect(FixedModel([4.,3.,2.,1.,0.]),[[]],[B+2])
        b=inspect(FixedModel([104.,103.,102.,101.,100.]),[[]],[B+2])
        self.assertEqual(a["mean_target_rank"],b["mean_target_rank"])
        self.assertEqual(a["mean_best_to_target_logit_gap"],b["mean_best_to_target_logit_gap"])
    def test_strictly_increasing_target_logit_improves_rank(self):
        low=inspect(FixedModel([5.,4.,3.,2.,1.]),[[]],[B+4])
        high=inspect(FixedModel([5.,4.,3.,2.,6.]),[[]],[B+4])
        self.assertGreater(low["mean_target_rank"],high["mean_target_rank"])
        self.assertGreater(low["mean_best_to_target_logit_gap"],high["mean_best_to_target_logit_gap"])
    def test_case_permutation_preserves_aggregates(self):
        model=FixedModel([5.,4.,3.,2.,1.])
        a=inspect(model,[[],[B]], [B,B+4])
        b=inspect(model,[[B],[]], [B+4,B])
        self.assertEqual(a,b)
    def test_repeated_cases_do_not_change_means(self):
        model=FixedModel([5.,4.,3.,2.,1.])
        a=inspect(model,[[]],[B+2])
        b=inspect(model,[[],[],[]],[B+2]*3)
        self.assertEqual(a["mean_target_rank"],b["mean_target_rank"])
        self.assertEqual(a["mean_best_to_target_logit_gap"],b["mean_best_to_target_logit_gap"])
    def test_all_ties_are_rank_one_under_dense_best_rank_contract(self):
        model=FixedModel([1.,1.,1.,1.,1.])
        for index in range(5):
            with self.subTest(index=index):
                report=inspect(model,[[]],[B+index])
                self.assertEqual(report["mean_target_rank"],1)
                self.assertEqual(report["mean_best_to_target_logit_gap"],0)
    def test_negative_logits_are_valid(self):
        result=inspect(FixedModel([-1.,-2.,-3.,-4.,-5.]),[[]],[B+3])
        self.assertEqual(result["mean_target_rank"],4)
        self.assertEqual(result["mean_best_to_target_logit_gap"],3)
    def test_fractional_gap(self):
        result=inspect(FixedModel([0.5,0.25,0.,-0.25,-0.5]),[[]],[B+1])
        self.assertEqual(result["mean_best_to_target_logit_gap"],0.25)
    def test_no_example_level_data_in_report(self):
        report=inspect(FixedModel([5.,4.,3.,2.,1.]),[[B+1]],[B+2])
        self.assertEqual(set(report),{
            "contract","cases","target_top_one_cases","mean_target_rank",
            "mean_best_to_target_logit_gap","max_best_to_target_logit_gap",
            "raw_text_exposed","raw_token_ids_exposed","raw_logits_exposed"})
if __name__=="__main__": unittest.main()
