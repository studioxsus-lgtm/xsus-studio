"""Deterministic bounded stress checks, no fragile time-based assertions."""
import unittest
from languages.en.text.batch_api_v6 import analyze_batch_v6
from languages.en.text.context_v6 import analyze_context

class V6StressTests(unittest.TestCase):
    def test_full_batch_capacity(self):
        result = analyze_batch_v6(["Please summarize this paragraph."] * 32)
        self.assertEqual(result["succeeded"], 32)
        self.assertEqual(result["failed"], 0)

    def test_many_repeated_batches_remain_stable(self):
        samples = ["Why is it late?", "Explain this process.", "Translate this text."]
        expected = analyze_batch_v6(samples)
        for _ in range(40):
            self.assertEqual(analyze_batch_v6(samples), expected)

    def test_long_valid_input(self):
        result = analyze_batch_v6(["a" * 10000])
        self.assertEqual(result["succeeded"], 1)

    def test_context_window_is_bounded(self):
        result = analyze_context(["Hello."] * 200, max_turns=12)
        self.assertEqual(len(result.turns), 12)
        self.assertTrue(result.truncated)

    def test_repeated_invalid_items_do_not_abort(self):
        result = analyze_batch_v6([""] * 32)
        self.assertEqual(result["failed"], 32)
        self.assertEqual(result["succeeded"], 0)
