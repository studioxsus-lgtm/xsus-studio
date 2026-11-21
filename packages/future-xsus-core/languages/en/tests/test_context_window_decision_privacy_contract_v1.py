"""Privacy contract for aggregate-only context-window decisions."""
import json
import unittest
from languages.en.evaluation.context_window_decision_v1 import inspect_context_window_decision_v1 as decide

def fixture():
    def row(rank):
        return {"mean_first_target_rank":rank,
                "mean_best_to_target_logit_gap":1.0,
                "first_target_top_one_correct":0,
                "matched_target_preferred_cases":0,
                "first_target_cases":10,
                "distinct_context_windows":10,
                "colliding_cases":0,
                "greedy_winner_changed_cases":0}
    return {"cases":10,"weights_retrained":False,
            "release_authorized":False,"production_context_changed":False,
            "windows":{"16":row(100),"32":row(80),"64":row(70)}}

class DecisionPrivacyContract(unittest.TestCase):
    def test_privacy_flags_are_false(self):
        result=decide(fixture())
        for key in ("raw_text_exposed","raw_token_ids_exposed","raw_logits_exposed"):
            with self.subTest(key=key):
                self.assertIs(result[key],False)

    def test_raw_payload_fields_are_absent(self):
        result=decide(fixture())
        for key in ("raw_text","raw_token_ids","raw_logits","prompt","response","token_ids"):
            with self.subTest(key=key):
                self.assertNotIn(key,result)

    def test_injected_raw_payload_not_copied(self):
        report=fixture()
        report["raw_text"]="PRIVATE_SYNTHETIC_MARKER"
        report["raw_logits"]=[9.9,8.8]
        report["windows"]["16"]["raw_token_ids"]=[101,102]
        result=decide(report)
        serialized=json.dumps(result)
        self.assertNotIn("PRIVATE_SYNTHETIC_MARKER",serialized)
        self.assertNotIn('"raw_logits":',serialized)
        self.assertNotIn('"raw_token_ids":',serialized)

    def test_no_raw_payload_in_nested_comparisons(self):
        result=decide(fixture())
        for comparison in result["comparisons"].values():
            self.assertEqual(set(comparison),{
                "rank_delta_vs_16","gap_delta_vs_16",
                "top_one_delta_vs_16","preference_delta_vs_16",
                "rank_and_gap_both_improve"})

    def test_json_is_strictly_serializable(self):
        result=decide(fixture())
        self.assertEqual(json.loads(json.dumps(result,allow_nan=False)),result)

    def test_no_automatic_training_even_with_better_ranks(self):
        result=decide(fixture())
        self.assertTrue(result["comparisons"]["32"]["rank_and_gap_both_improve"] is False)
        self.assertFalse(result["training_authorized"])
        self.assertFalse(result["release_authorized"])

    def test_output_is_deterministic(self):
        self.assertEqual(decide(fixture()),decide(fixture()))

if __name__=="__main__":
    unittest.main()
