import unittest
from languages.en.evaluation.prompt_sensitivity_v1 import inspect_prompt_sensitivity_v1 as inspect


class Model:
    vocab_size=3
    def logits(self,prefix):
        return [1.0,2.0+sum(prefix),3.0-sum(prefix)]


class PromptSensitivityV1Tests(unittest.TestCase):
    def setUp(self):
        self.model=Model()

    def test_cases(self):
        self.assertEqual(inspect(self.model,[[],[1]])["cases"],2)

    def test_winner_changes(self):
        self.assertEqual(inspect(self.model,[[],[1]])["distinct_greedy_winners"],2)

    def test_identical_winner(self):
        self.assertTrue(inspect(self.model,[[],[]])["identical_greedy_winner"])

    def test_zero_delta(self):
        self.assertEqual(inspect(self.model,[[],[]])["max_logit_delta_from_first"],0)

    def test_nonzero_delta(self):
        self.assertEqual(inspect(self.model,[[],[1]])["max_logit_delta_from_first"],1)

    def test_mean_delta(self):
        self.assertEqual(inspect(self.model,[[],[1],[2]])["mean_max_logit_delta_from_first"],1.5)

    def test_no_text(self):
        self.assertFalse(inspect(self.model,[[],[]])["raw_text_exposed"])

    def test_no_ids(self):
        self.assertFalse(inspect(self.model,[[],[]])["raw_token_ids_exposed"])

    def test_no_logits(self):
        self.assertFalse(inspect(self.model,[[],[]])["raw_logits_exposed"])

    def test_reject_single(self):
        with self.assertRaises(ValueError):
            inspect(self.model,[[]])

    def test_reject_invalid_token(self):
        with self.assertRaises(ValueError):
            inspect(self.model,[[],[3]])

    def test_reject_noninteger(self):
        with self.assertRaises(ValueError):
            inspect(self.model,[[],["x"]])

    def test_reject_nan(self):
        class Bad(Model):
            def logits(self,prefix):
                return [0.0,float("nan"),0.0]
        with self.assertRaises(ValueError):
            inspect(Bad(),[[],[]])

    def test_contract(self):
        self.assertEqual(inspect(self.model,[[],[]])["contract"],"future-xsus-core.prompt-sensitivity.v1")
