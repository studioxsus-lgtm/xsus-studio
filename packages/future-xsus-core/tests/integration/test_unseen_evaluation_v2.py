import unittest
from core.intelligence.unseen_evaluation_v2 import evaluate_generated

class GeneratedEvaluationTests(unittest.TestCase):
    def test_multiple_seeds(self):
        for seed in (108,91827,4294967297,2**64-1):
            with self.subTest(seed=seed):
                report=evaluate_generated(seed,cases=128)
                self.assertEqual(report["passed"],128)
                self.assertEqual(report["failed_indices"],())
                self.assertEqual(sum(report["expected_counts"].values()),128)
                self.assertGreater(report["expected_counts"]["partial"],0)
                self.assertGreater(report["expected_counts"]["unknown"],0)
                self.assertFalse(report["production_ready"])
    def test_repeatability(self):
        self.assertEqual(evaluate_generated(42,cases=16),evaluate_generated(42,cases=16))
    def test_invalid_inputs(self):
        for seed in (True,-1,2**64):
            with self.assertRaises(ValueError):
                evaluate_generated(seed)
        for count in (True,0,513):
            with self.assertRaises(ValueError):
                evaluate_generated(1,cases=count)
