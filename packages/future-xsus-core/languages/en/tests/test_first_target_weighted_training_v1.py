import unittest
from languages.en.learning.first_target_weighted_training_v1 import train_first_target_weighted_v1 as train


class Model:
    def __init__(self):
        self.calls=[]
    def train_step(self,prefix,target,learning_rate):
        self.calls.append((list(prefix),target,learning_rate))


class FirstTargetWeightedTrainingV1Tests(unittest.TestCase):
    def setUp(self):
        self.model=Model()
        self.examples=[([1],[2,3])]

    def test_default_step_count(self):
        self.assertEqual(train(self.model,self.examples,learning_rate=0.01)["gradient_steps"],2)

    def test_double_first_step(self):
        self.assertEqual(train(self.model,self.examples,learning_rate=0.01,first_target_weight=2)["gradient_steps"],3)

    def test_first_target_repeated(self):
        train(self.model,self.examples,learning_rate=0.01,first_target_weight=3)
        self.assertEqual([call[1] for call in self.model.calls],[2,2,2,3])

    def test_context_not_extended_until_after_repeats(self):
        train(self.model,self.examples,learning_rate=0.01,first_target_weight=2)
        self.assertEqual([call[0] for call in self.model.calls],[[1],[1],[1,2]])

    def test_first_steps(self):
        self.assertEqual(train(self.model,self.examples,learning_rate=0.01,first_target_weight=4)["first_target_gradient_steps"],4)

    def test_multiple_examples(self):
        result=train(self.model,[([1],[2]),([3],[4])],learning_rate=0.01,first_target_weight=2)
        self.assertEqual(result["gradient_steps"],4)

    def test_no_raw_text(self):
        self.assertFalse(train(self.model,self.examples,learning_rate=0.01)["raw_text_exposed"])

    def test_no_raw_ids(self):
        self.assertFalse(train(self.model,self.examples,learning_rate=0.01)["raw_token_ids_exposed"])

    def test_reject_empty(self):
        with self.assertRaises(ValueError):
            train(self.model,[],learning_rate=0.01)

    def test_reject_missing_targets(self):
        with self.assertRaises(ValueError):
            train(self.model,[([1],[])],learning_rate=0.01)

    def test_reject_weight_zero(self):
        with self.assertRaises(ValueError):
            train(self.model,self.examples,learning_rate=0.01,first_target_weight=0)

    def test_reject_weight_nine(self):
        with self.assertRaises(ValueError):
            train(self.model,self.examples,learning_rate=0.01,first_target_weight=9)

    def test_reject_float_weight(self):
        with self.assertRaises(ValueError):
            train(self.model,self.examples,learning_rate=0.01,first_target_weight=1.5)

    def test_reject_boolean_weight(self):
        with self.assertRaises(ValueError):
            train(self.model,self.examples,learning_rate=0.01,first_target_weight=True)

    def test_reject_bad_rate(self):
        with self.assertRaises(ValueError):
            train(self.model,self.examples,learning_rate=0,first_target_weight=2)

    def test_contract(self):
        self.assertEqual(train(self.model,self.examples,learning_rate=0.01)["contract"],"future-xsus-core.first-target-weighted-training.v1")
