import unittest
from languages.en.learning.position_balanced_training_v1 import train_position_balanced_v1 as train


class Model:
    def __init__(self):
        self.calls=[]
    def train_step(self,prefix,target,rate):
        self.calls.append((tuple(prefix),target,rate))


class PositionBalancedTrainingTests(unittest.TestCase):
    def setUp(self):
        self.model=Model()
        self.examples=[([10],[11,12,13,14,15,16])]

    def test_default_counts(self):
        self.assertEqual(train(self.model,self.examples,learning_rate=.01)["gradient_steps_by_position"],{"first":2,"early":3,"later":4})

    def test_default_total(self):
        self.assertEqual(train(self.model,self.examples,learning_rate=.01)["gradient_steps"],9)

    def test_uniform_control(self):
        self.assertEqual(train(self.model,self.examples,learning_rate=.01,first_weight=1,later_weight=1)["gradient_steps"],6)

    def test_first_repeated_without_context_leak(self):
        train(self.model,self.examples,learning_rate=.01)
        self.assertEqual(self.model.calls[0][0],self.model.calls[1][0])

    def test_later_context(self):
        train(self.model,self.examples,learning_rate=.01)
        self.assertEqual(self.model.calls[-1][0],(10,11,12,13,14,15))

    def test_early_window(self):
        row=train(self.model,self.examples,learning_rate=.01,early_window=2)
        self.assertEqual(row["gradient_steps_by_position"]["early"],1)

    def test_custom_weights(self):
        row=train(self.model,self.examples,learning_rate=.01,first_weight=3,early_weight=2,later_weight=1)
        self.assertEqual(row["gradient_steps"],11)

    def test_multiple_examples(self):
        row=train(self.model,self.examples*2,learning_rate=.01)
        self.assertEqual(row["examples"],2)

    def test_no_raw_text(self):
        self.assertFalse(train(self.model,self.examples,learning_rate=.01)["raw_text_exposed"])

    def test_no_token_ids(self):
        self.assertFalse(train(self.model,self.examples,learning_rate=.01)["raw_token_ids_exposed"])

    def test_no_deployment(self):
        self.assertFalse(train(self.model,self.examples,learning_rate=.01)["production_deployed"])

    def test_invalid_first_weight(self):
        with self.assertRaises(ValueError):
            train(self.model,self.examples,learning_rate=.01,first_weight=0)

    def test_invalid_later_weight(self):
        with self.assertRaises(ValueError):
            train(self.model,self.examples,learning_rate=.01,later_weight=9)

    def test_invalid_boolean_weight(self):
        with self.assertRaises(ValueError):
            train(self.model,self.examples,learning_rate=.01,early_weight=True)

    def test_invalid_window(self):
        with self.assertRaises(ValueError):
            train(self.model,self.examples,learning_rate=.01,early_window=1)

    def test_invalid_rate(self):
        with self.assertRaises(ValueError):
            train(self.model,self.examples,learning_rate=0)

    def test_empty_examples(self):
        with self.assertRaises(ValueError):
            train(self.model,[],learning_rate=.01)

    def test_empty_targets(self):
        with self.assertRaises(ValueError):
            train(self.model,[([10],[])],learning_rate=.01)

    def test_contract(self):
        self.assertEqual(train(self.model,self.examples,learning_rate=.01)["contract"],"future-xsus-core.position-balanced-training.v1")
