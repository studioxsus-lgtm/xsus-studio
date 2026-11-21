"""Contract tests: accepted generated answers, not teacher-forced rank, drive evidence."""
import json
import unittest
from copy import deepcopy
from languages.en.evaluation.generation_quality_comparison_v1 import inspect_generation_quality_comparison_v1 as compare

def fixture():
    def row(accepted,empty):
        return {"evaluated_cases":10,"accepted_responses":accepted,"empty_responses":empty}
    return {"cases":10,"independent_holdout":True,"weights_retrained":False,
            "windows":{"16":row(0,8),"32":row(3,4),"64":row(2,5)}}

class GenerationQualityComparisonTests(unittest.TestCase):
    def test_acceptance_delta(self):
        self.assertEqual(compare(fixture())["comparisons"]["32"]["accepted_delta_vs_16"],3)
    def test_empty_delta(self):
        self.assertEqual(compare(fixture())["comparisons"]["32"]["empty_delta_vs_16"],-4)
    def test_improvement_signal_is_not_release(self):
        result=compare(fixture())
        self.assertTrue(result["comparisons"]["32"]["acceptance_increased_without_more_empty"])
        self.assertFalse(result["quality_improvement_proven"])
        self.assertFalse(result["release_authorized"])
        self.assertFalse(result["training_authorized"])
    def test_increased_empty_is_not_positive_signal(self):
        data=fixture()
        data["windows"]["32"]["empty_responses"]=9
        data["windows"]["32"]["accepted_responses"]=1
        with self.assertRaises(ValueError): compare(data)
    def test_worse_empty_rate_blocks_signal(self):
        data=fixture()
        data["windows"]["16"]["empty_responses"]=0
        self.assertFalse(compare(data)["comparisons"]["32"]["acceptance_increased_without_more_empty"])
    def test_no_holdout_rejected(self):
        for value in (None,False,1,"true"):
            with self.subTest(value=value):
                data=fixture()
                data["independent_holdout"]=value
                with self.assertRaises(ValueError): compare(data)
    def test_retrained_evidence_rejected(self):
        data=fixture()
        data["weights_retrained"]=True
        with self.assertRaises(ValueError): compare(data)
    def test_missing_window_rejected(self):
        data=fixture()
        del data["windows"]["64"]
        with self.assertRaises(ValueError): compare(data)
    def test_invalid_counts_rejected(self):
        for field in ("evaluated_cases","accepted_responses","empty_responses"):
            for value in (None,True,-1,11,10.5,"10"):
                with self.subTest(field=field,value=value):
                    data=fixture()
                    data["windows"]["32"][field]=value
                    with self.assertRaises(ValueError): compare(data)
    def test_zero_accepted_is_not_improvement(self):
        data=fixture()
        data["windows"]["32"]["accepted_responses"]=0
        self.assertFalse(compare(data)["comparisons"]["32"]["acceptance_increased_without_more_empty"])
    def test_no_raw_payload_leakage(self):
        data=fixture()
        data["raw_prompt"]="PRIVATE_SYNTHETIC_MARKER"
        data["windows"]["16"]["raw_logits"]=[1.0,2.0]
        output=json.dumps(compare(data))
        self.assertNotIn("PRIVATE_SYNTHETIC_MARKER",output)
        self.assertNotIn('"raw_logits":',output)
    def test_json_round_trip(self):
        result=compare(fixture())
        self.assertEqual(json.loads(json.dumps(result,allow_nan=False)),result)
    def test_input_unchanged(self):
        data=fixture()
        before=deepcopy(data)
        compare(data)
        self.assertEqual(data,before)
if __name__=="__main__":
    unittest.main()
