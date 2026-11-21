import unittest
from languages.en.evaluation.teacher_forced_positions_v1 import inspect_teacher_forced_positions_v1 as inspect
from languages.en.text.tokenizer import BYTE_OFFSET


class Model:
    vocab_size=BYTE_OFFSET+3
    def logits(self,prefix):
        logits=[-10.0]*self.vocab_size
        logits[BYTE_OFFSET]=2.0
        logits[BYTE_OFFSET+1]=1.0
        return logits


class TeacherForcedPositionsTests(unittest.TestCase):
    def setUp(self):
        self.model=Model()
        self.examples=[([BYTE_OFFSET],[BYTE_OFFSET,BYTE_OFFSET+1,BYTE_OFFSET,BYTE_OFFSET+1,BYTE_OFFSET])]

    def test_first(self):
        self.assertEqual(inspect(self.model,self.examples)["segments"]["first"]["top_one_correct"],1)

    def test_early_count(self):
        self.assertEqual(inspect(self.model,self.examples)["segments"]["early"]["tokens"],3)

    def test_later_count(self):
        self.assertEqual(inspect(self.model,self.examples)["segments"]["later"]["tokens"],1)

    def test_early_accuracy(self):
        self.assertEqual(inspect(self.model,self.examples)["segments"]["early"]["top_one_accuracy"],0.333333)

    def test_later_accuracy(self):
        self.assertEqual(inspect(self.model,self.examples)["segments"]["later"]["top_one_accuracy"],1.0)

    def test_first_gap(self):
        self.assertEqual(inspect(self.model,self.examples)["segments"]["first"]["mean_best_to_target_gap"],0)

    def test_early_gap(self):
        self.assertEqual(inspect(self.model,self.examples)["segments"]["early"]["mean_best_to_target_gap"],0.666667)

    def test_window_two(self):
        self.assertEqual(inspect(self.model,self.examples,early_window=2)["segments"]["early"]["tokens"],1)

    def test_no_later(self):
        self.assertIsNone(inspect(self.model,[([], [BYTE_OFFSET])])["segments"]["later"]["top_one_accuracy"])

    def test_eos_excluded(self):
        self.assertEqual(inspect(self.model,[([], [BYTE_OFFSET,1])])["segments"]["first"]["tokens"],1)

    def test_no_raw_text(self):
        self.assertFalse(inspect(self.model,self.examples)["raw_text_exposed"])

    def test_no_raw_ids(self):
        self.assertFalse(inspect(self.model,self.examples)["raw_token_ids_exposed"])

    def test_no_logits(self):
        self.assertFalse(inspect(self.model,self.examples)["raw_logits_exposed"])

    def test_reject_empty(self):
        with self.assertRaises(ValueError):
            inspect(self.model,[])

    def test_reject_bad_window(self):
        with self.assertRaises(ValueError):
            inspect(self.model,self.examples,early_window=0)

    def test_reject_bad_target(self):
        with self.assertRaises(ValueError):
            inspect(self.model,[([],[-1])])

    def test_contract(self):
        self.assertEqual(inspect(self.model,self.examples)["contract"],"future-xsus-core.teacher-forced-positions.v1")
