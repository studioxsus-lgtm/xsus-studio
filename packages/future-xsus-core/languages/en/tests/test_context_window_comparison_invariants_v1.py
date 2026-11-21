"""Metamorphic checks for aggregate-only context comparisons."""
import unittest
from copy import deepcopy
from languages.en.evaluation.context_window_decision_v1 import inspect_context_window_decision_v1 as decide

def fixture():
    def row(rank,gap,top,preferred):
        return {"mean_first_target_rank":rank,
                "mean_best_to_target_logit_gap":gap,
                "first_target_top_one_correct":top,
                "matched_target_preferred_cases":preferred,
                "first_target_cases":10,
                "distinct_context_windows":10,
                "colliding_cases":0,
                "greedy_winner_changed_cases":0}
    return {"cases":10,"weights_retrained":False,
            "release_authorized":False,"production_context_changed":False,
            "windows":{"16":row(90,2,1,2),
                       "32":row(70,1.5,3,5),
                       "64":row(60,1.25,4,7)}}

class ComparisonInvariants(unittest.TestCase):
    def test_identical_windows_produce_zero_deltas(self):
        report=fixture()
        for size in ("32","64"):
            report["windows"][size]=deepcopy(report["windows"]["16"])
        result=decide(report)
        for comparison in result["comparisons"].values():
            self.assertEqual(comparison["rank_delta_vs_16"],0)
            self.assertEqual(comparison["gap_delta_vs_16"],0)
            self.assertEqual(comparison["top_one_delta_vs_16"],0)
            self.assertEqual(comparison["preference_delta_vs_16"],0)
            self.assertFalse(comparison["rank_and_gap_both_improve"])

    def test_all_metrics_improve_without_release(self):
        result=decide(fixture())
        for size in ("32","64"):
            self.assertTrue(result["comparisons"][size]["rank_and_gap_both_improve"])
        self.assertFalse(result["quality_improvement_proven"])
        self.assertFalse(result["release_authorized"])

    def test_only_rank_improves(self):
        report=fixture()
        report["windows"]["32"]["mean_best_to_target_logit_gap"]=2.5
        self.assertFalse(decide(report)["comparisons"]["32"]["rank_and_gap_both_improve"])

    def test_only_gap_improves(self):
        report=fixture()
        report["windows"]["32"]["mean_first_target_rank"]=95
        self.assertFalse(decide(report)["comparisons"]["32"]["rank_and_gap_both_improve"])

    def test_equal_rank_is_not_improvement(self):
        report=fixture()
        report["windows"]["32"]["mean_first_target_rank"]=90
        self.assertFalse(decide(report)["comparisons"]["32"]["rank_and_gap_both_improve"])

    def test_equal_gap_is_not_improvement(self):
        report=fixture()
        report["windows"]["32"]["mean_best_to_target_logit_gap"]=2
        self.assertFalse(decide(report)["comparisons"]["32"]["rank_and_gap_both_improve"])

    def test_worse_rank_has_positive_delta(self):
        report=fixture()
        report["windows"]["32"]["mean_first_target_rank"]=100
        self.assertEqual(decide(report)["comparisons"]["32"]["rank_delta_vs_16"],10)

    def test_worse_gap_has_positive_delta(self):
        report=fixture()
        report["windows"]["32"]["mean_best_to_target_logit_gap"]=3
        self.assertEqual(decide(report)["comparisons"]["32"]["gap_delta_vs_16"],1)

    def test_top_one_can_regress(self):
        report=fixture()
        report["windows"]["16"]["first_target_top_one_correct"]=8
        report["windows"]["32"]["first_target_top_one_correct"]=2
        self.assertEqual(decide(report)["comparisons"]["32"]["top_one_delta_vs_16"],-6)

    def test_preference_can_regress(self):
        report=fixture()
        report["windows"]["16"]["matched_target_preferred_cases"]=8
        report["windows"]["32"]["matched_target_preferred_cases"]=2
        self.assertEqual(decide(report)["comparisons"]["32"]["preference_delta_vs_16"],-6)

    def test_unrelated_window_does_not_change_other_comparison(self):
        report=fixture()
        original=decide(report)["comparisons"]["32"]
        report["windows"]["64"]["mean_first_target_rank"]=999
        self.assertEqual(decide(report)["comparisons"]["32"],original)

    def test_window_dict_order_is_irrelevant(self):
        report=fixture()
        reversed_report=deepcopy(report)
        reversed_report["windows"]=dict(reversed(list(report["windows"].items())))
        self.assertEqual(decide(report),decide(reversed_report))

    def test_aggregate_output_contains_no_window_logits(self):
        result=decide(fixture())
        self.assertEqual(set(result["comparisons"]),{"32","64"})
        for comparison in result["comparisons"].values():
            self.assertEqual(set(comparison),{
                "rank_delta_vs_16","gap_delta_vs_16","top_one_delta_vs_16",
                "preference_delta_vs_16","rank_and_gap_both_improve"})

if __name__=="__main__":
    unittest.main()
