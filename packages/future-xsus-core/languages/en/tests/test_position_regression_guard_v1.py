import unittest
from languages.en.evaluation.position_regression_guard_v1 import inspect_position_regression_v1 as inspect


def fixture():
    def group(later):
        return {"teacher_forced_positions":{"segments":{
            "first":{"tokens":10,"top_one_correct":0},
            "early":{"tokens":30,"top_one_correct":0},
            "later":{"tokens":290,"top_one_correct":later}}}}
    return {"arms":{
        "1":{"benchmarks":{"written-v4":group(20),"written-v5":group(20)}},
        "2":{"benchmarks":{"written-v4":group(20),"written-v5":group(20)}},
        "4":{"benchmarks":{"written-v4":group(0),"written-v5":group(0)}},
        "8":{"benchmarks":{"written-v4":group(0),"written-v5":group(0)}},
    }}


class PositionRegressionGuardTests(unittest.TestCase):
    def test_control_no_regression(self):
        self.assertFalse(inspect(fixture())["arms"]["1"]["position_regression"])

    def test_weight_two_no_regression(self):
        self.assertFalse(inspect(fixture())["arms"]["2"]["position_regression"])

    def test_weight_four_regression(self):
        self.assertTrue(inspect(fixture())["arms"]["4"]["position_regression"])

    def test_weight_eight_regression(self):
        self.assertTrue(inspect(fixture())["arms"]["8"]["position_regression"])

    def test_later_delta(self):
        self.assertEqual(inspect(fixture())["arms"]["4"]["correct_token_deltas_by_group"]["written-v4"]["later"],-20)

    def test_nonregressing(self):
        self.assertEqual(inspect(fixture())["nonregressing_weights"],["1","2"])

    def test_no_release(self):
        self.assertFalse(inspect(fixture())["position_guard_authorizes_release"])

    def test_manual_release(self):
        self.assertTrue(inspect(fixture())["human_release_required"])

    def test_private_text(self):
        self.assertFalse(inspect(fixture())["raw_text_exposed"])

    def test_private_ids(self):
        self.assertFalse(inspect(fixture())["raw_token_ids_exposed"])

    def test_reject_missing_control(self):
        data=fixture()
        del data["arms"]["1"]
        with self.assertRaises(ValueError):
            inspect(data)

    def test_reject_missing_benchmark(self):
        data=fixture()
        del data["arms"]["4"]["benchmarks"]["written-v5"]
        with self.assertRaises(ValueError):
            inspect(data)

    def test_reject_mismatched_tokens(self):
        data=fixture()
        data["arms"]["4"]["benchmarks"]["written-v4"]["teacher_forced_positions"]["segments"]["later"]["tokens"]=289
        with self.assertRaises(ValueError):
            inspect(data)

    def test_contract(self):
        self.assertEqual(inspect(fixture())["contract"],"future-xsus-core.position-regression-guard.v1")
