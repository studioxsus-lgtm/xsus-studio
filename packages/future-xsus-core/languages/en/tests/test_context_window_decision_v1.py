"""Independent contract tests for conservative context-window comparisons."""
import unittest
from copy import deepcopy
from languages.en.evaluation.context_window_decision_v1 import inspect_context_window_decision_v1 as decide

def fixture():
    return {
        "cases":10,"weights_retrained":False,"release_authorized":False,"production_context_changed":False,
        "windows":{
            "16":{"mean_first_target_rank":100.0,"mean_best_to_target_logit_gap":2.0,
                  "first_target_top_one_correct":0,"matched_target_preferred_cases":0,"first_target_cases":10},
            "32":{"mean_first_target_rank":80.0,"mean_best_to_target_logit_gap":1.5,
                  "first_target_top_one_correct":0,"matched_target_preferred_cases":8,"first_target_cases":10},
            "64":{"mean_first_target_rank":90.0,"mean_best_to_target_logit_gap":1.8,
                  "first_target_top_one_correct":0,"matched_target_preferred_cases":8,"first_target_cases":10},
        },
    }

class ContextWindowDecisionTests(unittest.TestCase):
    def test_rank_delta(self):
        self.assertEqual(decide(fixture())["comparisons"]["32"]["rank_delta_vs_16"],-20)
    def test_gap_delta(self):
        self.assertEqual(decide(fixture())["comparisons"]["32"]["gap_delta_vs_16"],-0.5)
    def test_preference_delta(self):
        self.assertEqual(decide(fixture())["comparisons"]["32"]["preference_delta_vs_16"],8)
    def test_top_one_stays_zero(self):
        self.assertEqual(decide(fixture())["comparisons"]["32"]["top_one_delta_vs_16"],0)
    def test_rank_and_gap_flag(self):
        self.assertTrue(decide(fixture())["comparisons"]["32"]["rank_and_gap_both_improve"])
    def test_no_training_or_release(self):
        result=decide(fixture())
        self.assertFalse(result["training_authorized"])
        self.assertFalse(result["release_authorized"])
        self.assertFalse(result["quality_improvement_proven"])
        self.assertTrue(result["independent_holdout_required"])
    def test_no_raw_payload(self):
        result=decide(fixture())
        self.assertFalse(result["raw_text_exposed"])
        self.assertFalse(result["raw_token_ids_exposed"])
        self.assertFalse(result["raw_logits_exposed"])
    def test_input_not_mutated(self):
        report=fixture()
        original=deepcopy(report)
        decide(report)
        self.assertEqual(report,original)
    def test_missing_window_rejected(self):
        report=fixture()
        del report["windows"]["64"]
        with self.assertRaises(ValueError): decide(report)
    def test_retrained_report_rejected(self):
        report=fixture()
        report["weights_retrained"]=True
        with self.assertRaises(ValueError): decide(report)
    def test_nonfinite_rank_rejected(self):
        report=fixture()
        report["windows"]["32"]["mean_first_target_rank"]=float("nan")
        with self.assertRaises(ValueError): decide(report)
    def test_invalid_count_rejected(self):
        report=fixture()
        report["windows"]["32"]["matched_target_preferred_cases"]=11
        with self.assertRaises(ValueError): decide(report)
    def test_changed_production_context_rejected(self):
        report=fixture()
        report["production_context_changed"]=True
        with self.assertRaises(ValueError): decide(report)
    def test_inconsistent_first_target_count_rejected(self):
        report=fixture()
        report["windows"]["32"]["first_target_cases"]=9
        with self.assertRaises(ValueError): decide(report)
    def test_preference_alone_not_sufficient(self):
        report=fixture()
        report["windows"]["32"]["mean_first_target_rank"]=110.0
        report["windows"]["32"]["mean_best_to_target_logit_gap"]=2.5
        result=decide(report)
        self.assertFalse(result["comparisons"]["32"]["rank_and_gap_both_improve"])
        self.assertFalse(result["quality_improvement_proven"])
if __name__=="__main__":
    unittest.main()
