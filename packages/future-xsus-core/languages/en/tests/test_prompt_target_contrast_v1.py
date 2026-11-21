import unittest
from languages.en.evaluation.prompt_target_contrast_v1 import inspect_prompt_target_contrast_v1 as inspect


class Model:
    vocab_size=4
    def logits(self,prefix):
        return [0.,float(3-prefix[0]),float(prefix[0]),0.]


class PromptTargetContrastTests(unittest.TestCase):
    def setUp(self):
        self.model=Model()
        self.rows=[([1],[1]),([2],[2])]

    def test_cases(self):
        self.assertEqual(inspect(self.model,self.rows)["cases"],2)

    def test_preferred(self):
        self.assertEqual(inspect(self.model,self.rows)["matched_target_preferred_cases"],2)

    def test_rate(self):
        self.assertEqual(inspect(self.model,self.rows)["matched_target_preferred_rate"],1.)

    def test_advantage(self):
        self.assertEqual(inspect(self.model,self.rows)["mean_matched_target_logit_advantage"],1.)

    def test_changed_winners(self):
        self.assertEqual(inspect(self.model,self.rows)["greedy_winner_changed_cases"],2)

    def test_no_release(self):
        self.assertFalse(inspect(self.model,self.rows)["release_authorized"])

    def test_no_raw_text(self):
        self.assertFalse(inspect(self.model,self.rows)["raw_text_exposed"])

    def test_no_raw_ids(self):
        self.assertFalse(inspect(self.model,self.rows)["raw_token_ids_exposed"])

    def test_no_logits(self):
        self.assertFalse(inspect(self.model,self.rows)["raw_logits_exposed"])

    def test_single_rejected(self):
        with self.assertRaises(ValueError):
            inspect(self.model,self.rows[:1])

    def test_bad_prompt(self):
        with self.assertRaises(ValueError):
            inspect(self.model,[([-1],[1]),([2],[2])])

    def test_bad_target(self):
        with self.assertRaises(ValueError):
            inspect(self.model,[([1],[5]),([2],[2])])

    def test_empty_targets(self):
        with self.assertRaises(ValueError):
            inspect(self.model,[([1],[]),([2],[2])])

    def test_contract(self):
        self.assertEqual(inspect(self.model,self.rows)["contract"],"future-xsus-core.prompt-target-contrast.v1")
