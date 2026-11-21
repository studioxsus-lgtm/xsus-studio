"""Bounded batch stress contract tests."""
import unittest

from languages.en.evaluation.sentence_batch_stress_v1 import evaluate_batch_stress


class BatchStressTests(unittest.TestCase):
    def test_repeated_batches_and_pairs(self):
        result = evaluate_batch_stress(10)
        self.assertTrue(result["passed"])
        self.assertEqual(result["failures"], 0)
        self.assertEqual(result["batch_evaluations"], 10)
        self.assertEqual(result["relation_evaluations"], 10)

    def test_no_performance_or_release_claim(self):
        result = evaluate_batch_stress(1)
        self.assertFalse(result["performance_benchmark_proven"])
        self.assertFalse(result["production_authorized"])
        self.assertFalse(result["raw_text_exposed"])

    def test_invalid_iterations_rejected(self):
        for count in (0, -1, 1001, 1.5, True, None, "100"):
            with self.subTest(count=count):
                with self.assertRaises(ValueError):
                    evaluate_batch_stress(count)


if __name__ == "__main__":
    unittest.main()
