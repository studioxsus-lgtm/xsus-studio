import unittest
from languages.en.evaluation.first_target_rank_v1 import inspect_first_target_rank_v1 as inspect
from languages.en.text.tokenizer import BYTE_OFFSET


class Model:
    vocab_size=BYTE_OFFSET+3
    def logits(self,prefix):
        values=[-10.0]*self.vocab_size
        values[BYTE_OFFSET]=3.0
        values[BYTE_OFFSET+1]=2.0+len(prefix)
        values[BYTE_OFFSET+2]=1.0
        return values


class FirstTargetRankV1Tests(unittest.TestCase):
    def setUp(self):
        self.model=Model()

    def test_cases(self):
        self.assertEqual(inspect(self.model,[[],[]],[BYTE_OFFSET,BYTE_OFFSET+1])["cases"],2)

    def test_top_one(self):
        self.assertEqual(inspect(self.model,[[],[]],[BYTE_OFFSET,BYTE_OFFSET+1])["target_top_one_cases"],1)

    def test_mean_rank(self):
        self.assertEqual(inspect(self.model,[[],[]],[BYTE_OFFSET,BYTE_OFFSET+1])["mean_target_rank"],1.5)

    def test_mean_gap(self):
        self.assertEqual(inspect(self.model,[[],[]],[BYTE_OFFSET,BYTE_OFFSET+1])["mean_best_to_target_logit_gap"],0.5)

    def test_max_gap(self):
        self.assertEqual(inspect(self.model,[[],[]],[BYTE_OFFSET,BYTE_OFFSET+1])["max_best_to_target_logit_gap"],1.0)

    def test_context_target_wins(self):
        self.assertEqual(inspect(self.model,[[1]],[BYTE_OFFSET+1])["target_top_one_cases"],1)

    def test_no_text(self):
        self.assertFalse(inspect(self.model,[[]],[BYTE_OFFSET])["raw_text_exposed"])

    def test_no_ids(self):
        self.assertFalse(inspect(self.model,[[]],[BYTE_OFFSET])["raw_token_ids_exposed"])

    def test_no_logits(self):
        self.assertFalse(inspect(self.model,[[]],[BYTE_OFFSET])["raw_logits_exposed"])

    def test_reject_empty(self):
        with self.assertRaises(ValueError):
            inspect(self.model,[],[])

    def test_reject_mismatched_lengths(self):
        with self.assertRaises(ValueError):
            inspect(self.model,[[]],[])

    def test_reject_bad_target(self):
        with self.assertRaises(ValueError):
            inspect(self.model,[[]],[0])

    def test_reject_bad_prefix(self):
        with self.assertRaises(ValueError):
            inspect(self.model,[[-1]],[BYTE_OFFSET])

    def test_reject_nan(self):
        class Bad(Model):
            def logits(self,prefix):
                values=super().logits(prefix)
                values[BYTE_OFFSET]=float("nan")
                return values
        with self.assertRaises(ValueError):
            inspect(Bad(),[[]],[BYTE_OFFSET])

    def test_contract(self):
        self.assertEqual(inspect(self.model,[[]],[BYTE_OFFSET])["contract"],"future-xsus-core.first-target-rank.v1")
