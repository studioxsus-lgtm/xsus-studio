import unittest
from languages.en.evaluation.first_target_ablation_decision_v1 import summarize_first_target_ablation_v1 as summarize


def fixture():
    arms={}
    for weight in ("1","2","4","8"):
        arms[weight]={"benchmarks":{
            name:{"generation":{"cases":10,"accepted":0,"distinct_normalized_responses":3},
                  "first_target_rank":{"cases":10,"mean_target_rank":150.0}}
            for name in ("written-v4","written-v5")}}
    return {"arms":arms}


class FirstTargetAblationDecisionV1Tests(unittest.TestCase):
    def test_four_arms(self):
        self.assertEqual(len(summarize(fixture())["arms"]),4)

    def test_cases(self):
        self.assertEqual(summarize(fixture())["arms"]["4"]["cases"],20)

    def test_zero_gain(self):
        self.assertFalse(summarize(fixture())["arms"]["4"]["quality_gain_proven"])

    def test_no_release(self):
        self.assertIsNone(summarize(fixture())["recommended_for_release"])

    def test_manual_gate(self):
        self.assertTrue(summarize(fixture())["human_release_required"])

    def test_no_private_text(self):
        self.assertFalse(summarize(fixture())["raw_text_exposed"])

    def test_no_token_ids(self):
        self.assertFalse(summarize(fixture())["raw_token_ids_exposed"])

    def test_mean_rank(self):
        self.assertEqual(summarize(fixture())["arms"]["4"]["mean_first_target_rank"],150.0)

    def test_distinct_count(self):
        self.assertEqual(summarize(fixture())["arms"]["4"]["sum_distinct_responses_by_benchmark"],6)

    def test_gain_detected_but_not_released(self):
        data=fixture()
        data["arms"]["4"]["benchmarks"]["written-v4"]["generation"]["accepted"]=1
        result=summarize(data)
        self.assertTrue(result["arms"]["4"]["quality_gain_proven"])
        self.assertEqual(result["quality_improving_weights"],["4"])
        self.assertIsNone(result["recommended_for_release"])

    def test_regression_rejected(self):
        data=fixture()
        data["arms"]["1"]["benchmarks"]["written-v4"]["generation"]["accepted"]=2
        data["arms"]["4"]["benchmarks"]["written-v4"]["generation"]["accepted"]=1
        data["arms"]["4"]["benchmarks"]["written-v5"]["generation"]["accepted"]=3
        result=summarize(data)
        self.assertTrue(result["arms"]["4"]["holdout_regression"])
        self.assertFalse(result["arms"]["4"]["quality_gain_proven"])

    def test_mismatched_benchmarks(self):
        data=fixture()
        del data["arms"]["4"]["benchmarks"]["written-v5"]
        with self.assertRaises(ValueError):
            summarize(data)

    def test_contract(self):
        self.assertEqual(summarize(fixture())["contract"],"future-xsus-core.first-target-ablation-decision.v1")
