"""Regression tests for first-target ranking diagnostics (no model training)."""
import unittest

from languages.en.evaluation.first_target_rank_v1 import inspect_first_target_rank_v1
from languages.en.text.tokenizer import BYTE_OFFSET


class FixedLogitsModel:
    vocab_size = BYTE_OFFSET + 3

    def __init__(self, values):
        self.values = values

    def logits(self, prefix):
        return [-100.0] * BYTE_OFFSET + list(self.values)


class FirstTargetRankEdgeCasesV1Tests(unittest.TestCase):
    def test_equal_best_logits_count_as_rank_one(self):
        result = inspect_first_target_rank_v1(
            FixedLogitsModel([2.0, 2.0, 1.0]),
            [[]], [BYTE_OFFSET + 1])
        self.assertEqual(result["mean_target_rank"], 1)
        self.assertEqual(result["target_top_one_cases"], 1)
        self.assertEqual(result["mean_best_to_target_logit_gap"], 0)

    def test_target_below_two_candidates(self):
        result = inspect_first_target_rank_v1(
            FixedLogitsModel([4.0, 3.0, 1.0]),
            [[]], [BYTE_OFFSET + 2])
        self.assertEqual(result["mean_target_rank"], 3)
        self.assertEqual(result["mean_best_to_target_logit_gap"], 3)
        self.assertEqual(result["target_top_one_cases"], 0)

    def test_negative_infinity_is_rejected(self):
        with self.assertRaises(ValueError):
            inspect_first_target_rank_v1(
                FixedLogitsModel([1.0, float("-inf"), 0.0]),
                [[]], [BYTE_OFFSET])

    def test_positive_infinity_is_rejected(self):
        with self.assertRaises(ValueError):
            inspect_first_target_rank_v1(
                FixedLogitsModel([1.0, float("inf"), 0.0]),
                [[]], [BYTE_OFFSET])

    def test_aggregate_does_not_disclose_inputs(self):
        result = inspect_first_target_rank_v1(
            FixedLogitsModel([2.0, 1.0, 0.0]),
            [[BYTE_OFFSET]], [BYTE_OFFSET])
        self.assertFalse(result["raw_text_exposed"])
        self.assertFalse(result["raw_token_ids_exposed"])
        self.assertFalse(result["raw_logits_exposed"])
        self.assertNotIn("prefixes", result)
        self.assertNotIn("first_targets", result)


if __name__ == "__main__":
    unittest.main()
