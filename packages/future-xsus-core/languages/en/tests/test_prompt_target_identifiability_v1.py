import unittest
from languages.en.evaluation.prompt_target_identifiability_v1 import inspect_prompt_target_identifiability_v1 as inspect


class Model:
    vocab_size=4
    def logits(self,prefix):
        return [0.,float(3-prefix[0]),float(prefix[0]),0.]


class PromptTargetIdentifiabilityTests(unittest.TestCase):
    def setUp(self):
        self.model=Model()

    def test_shared_target_flagged(self):
        self.assertFalse(inspect(self.model,[([1],[1]),([2],[1])])["first_target_contrast_identifiable"])

    def test_shared_target_zero_mean(self):
        self.assertTrue(inspect(self.model,[([1],[1]),([2],[1])])["rotation_mean_structurally_zero"])

    def test_shared_target_mean_is_zero(self):
        self.assertEqual(inspect(self.model,[([1],[1]),([2],[1])])["contrast"]["mean_matched_target_logit_advantage"],0.)

    def test_distinct_target_supported(self):
        self.assertTrue(inspect(self.model,[([1],[1]),([2],[2])])["first_target_contrast_identifiable"])

    def test_distinct_target_count(self):
        self.assertEqual(inspect(self.model,[([1],[1]),([2],[2])])["distinct_first_target_tokens"],2)

    def test_dominant_count(self):
        self.assertEqual(inspect(self.model,[([1],[1]),([2],[1]),([3],[2])])["dominant_first_target_count"],2)

    def test_dominant_rate(self):
        self.assertEqual(inspect(self.model,[([1],[1]),([2],[1]),([3],[2])])["dominant_first_target_rate"],0.666667)

    def test_shared_interpretation(self):
        self.assertEqual(inspect(self.model,[([1],[1]),([2],[1])])["interpretation"],"insufficient_target_diversity")

    def test_distinct_interpretation(self):
        self.assertEqual(inspect(self.model,[([1],[1]),([2],[2])])["interpretation"],"diagnostic_only")

    def test_no_proof(self):
        self.assertFalse(inspect(self.model,[([1],[1]),([2],[2])])["prompt_target_association_proven"])

    def test_no_release(self):
        self.assertFalse(inspect(self.model,[([1],[1]),([2],[2])])["release_authorized"])

    def test_no_text(self):
        self.assertFalse(inspect(self.model,[([1],[1]),([2],[2])])["raw_text_exposed"])

    def test_no_ids(self):
        self.assertFalse(inspect(self.model,[([1],[1]),([2],[2])])["raw_token_ids_exposed"])

    def test_invalid_single_case(self):
        with self.assertRaises(ValueError):
            inspect(self.model,[([1],[1])])

    def test_contract(self):
        self.assertEqual(inspect(self.model,[([1],[1]),([2],[2])])["contract"],"future-xsus-core.prompt-target-identifiability.v1")
