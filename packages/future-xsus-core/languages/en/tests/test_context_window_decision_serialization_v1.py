"""Ensure context-window decision evidence is stable, JSON-safe, and minimal."""
import json
import unittest
from copy import deepcopy
from languages.en.evaluation.context_window_decision_v1 import inspect_context_window_decision_v1 as decide

def report():
    def row(rank, gap, top, preferred, distinct, collisions, changed):
        return {
            "mean_first_target_rank":rank,
            "mean_best_to_target_logit_gap":gap,
            "first_target_top_one_correct":top,
            "matched_target_preferred_cases":preferred,
            "first_target_cases":10,
            "distinct_context_windows":distinct,
            "colliding_cases":collisions,
            "greedy_winner_changed_cases":changed,
        }
    return {
        "cases":10,"weights_retrained":False,"release_authorized":False,
        "production_context_changed":False,
        "windows":{
            "16":row(100.0,2.0,0,0,1,10,0),
            "32":row(80.0,1.5,0,8,10,0,0),
            "64":row(90.0,1.8,0,8,10,0,0),
        },
    }

class DecisionSerialization(unittest.TestCase):
    def test_json_round_trip(self):
        result=decide(report())
        self.assertEqual(json.loads(json.dumps(result,allow_nan=False)),result)

    def test_repeated_evaluation_is_deterministic(self):
        first=decide(report())
        second=decide(report())
        self.assertEqual(first,second)
        self.assertEqual(json.dumps(first,sort_keys=True),json.dumps(second,sort_keys=True))

    def test_window_input_order_is_irrelevant(self):
        first=report()
        second=deepcopy(first)
        second["windows"]=dict(reversed(list(second["windows"].items())))
        self.assertEqual(decide(first),decide(second))

    def test_extra_raw_fields_do_not_leak_to_output(self):
        data=report()
        data["raw_prompt"]="PRIVATE SYNTHETIC MARKER"
        data["windows"]["16"]["raw_logits"]=[1,2,3]
        serialized=json.dumps(decide(data))
        self.assertNotIn("PRIVATE SYNTHETIC MARKER",serialized)
        self.assertNotIn("raw_prompt",serialized)
        self.assertNotIn('"raw_logits":',serialized)
        self.assertFalse(json.loads(serialized)["raw_logits_exposed"])

    def test_no_token_identifiers_in_result(self):
        serialized=json.dumps(decide(report()))
        self.assertNotIn('"token_ids":',serialized)
        self.assertNotIn('"prompt":',serialized)
        self.assertNotIn('"response":',serialized)

    def test_reference_baseline_not_mutated(self):
        data=report()
        original=deepcopy(data)
        decide(data)
        self.assertEqual(data,original)

    def test_all_comparisons_reference_sixteen(self):
        result=decide(report())["comparisons"]
        self.assertEqual(result["32"]["rank_delta_vs_16"],-20)
        self.assertEqual(result["64"]["rank_delta_vs_16"],-10)
        self.assertEqual(result["32"]["gap_delta_vs_16"],-0.5)
        self.assertEqual(result["64"]["gap_delta_vs_16"],-0.2)

    def test_diagnostic_does_not_authorize_release(self):
        result=decide(report())
        self.assertFalse(result["training_authorized"])
        self.assertFalse(result["release_authorized"])
        self.assertFalse(result["quality_improvement_proven"])
        self.assertTrue(result["independent_holdout_required"])

if __name__=="__main__":
    unittest.main()
