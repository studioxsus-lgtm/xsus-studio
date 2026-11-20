import unittest
from dataclasses import asdict
from languages.en.evaluation.benchmark_v6 import benchmark_batch_v6

class BenchmarkV6Tests(unittest.TestCase):
    def test_benchmark_counts_and_serialization(self):
        report = benchmark_batch_v6(["Why is it late?", "Explain this process."], iterations=3)
        self.assertEqual((report.iterations, report.total_items, report.failures), (3, 6, 0))
        self.assertTrue(report.deterministic)
        self.assertGreaterEqual(report.elapsed_seconds, 0)
        self.assertIn("items_per_second", asdict(report))

    def test_invalid_items_counted_without_stopping(self):
        report = benchmark_batch_v6(["Hello.", ""], iterations=2)
        self.assertEqual(report.failures, 2)

    def test_rejects_invalid_sample_collections(self):
        for samples in (None, [], "hello", ["hello", 2], ["ok"] * 33):
            with self.subTest(samples=str(samples)[:20]), self.assertRaises(ValueError):
                benchmark_batch_v6(samples)

    def test_rejects_invalid_iterations(self):
        for iterations in (0, -1, 101, True, 2.5):
            with self.subTest(iterations=iterations), self.assertRaises(ValueError):
                benchmark_batch_v6(["Hello."], iterations=iterations)

    def test_no_performance_threshold_claim(self):
        report = benchmark_batch_v6(["Hello."])
        self.assertTrue(report.deterministic)
        self.assertGreaterEqual(report.items_per_second, 0)
