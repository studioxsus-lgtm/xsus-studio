import json
import unittest
from languages.en.text.batch_api_v6 import BatchLimits, analyze_batch_v6

class BatchApiV6Tests(unittest.TestCase):
    def test_empty_batch(self):
        result = analyze_batch_v6([])
        self.assertEqual((result["count"], result["succeeded"], result["failed"]), (0, 0, 0))

    def test_multiple_successes(self):
        result = analyze_batch_v6(["Why is it late?", "Summarize this report."])
        self.assertEqual((result["count"], result["succeeded"], result["failed"]), (2, 2, 0))
        self.assertEqual(result["results"][0]["analysis"]["intent"]["intent"], "question")
        json.dumps(result)

    def test_per_item_failure_isolated(self):
        result = analyze_batch_v6(["Hello.", "", "Translate this sentence."])
        self.assertEqual((result["succeeded"], result["failed"]), (2, 1))
        self.assertEqual(result["results"][1]["error"]["code"], "INVALID_TEXT")
        self.assertTrue(result["results"][2]["ok"])

    def test_batch_item_limit(self):
        with self.assertRaises(ValueError):
            analyze_batch_v6(["Hello."] * 33)

    def test_batch_character_limit(self):
        with self.assertRaises(ValueError):
            analyze_batch_v6(["a" * 10000] * 6)

    def test_custom_limits(self):
        with self.assertRaises(ValueError):
            analyze_batch_v6(["Hello.", "Hi."], limits=BatchLimits(max_items=1))

    def test_invalid_limits(self):
        for limits in (None, "invalid", BatchLimits(max_items=0), BatchLimits(max_items=True), BatchLimits(max_total_characters=0)):
            with self.subTest(limits=str(limits)), self.assertRaises(ValueError):
                analyze_batch_v6([], limits=limits)

    def test_invalid_collection(self):
        for texts in (None, "hello", {"text": "hello"}, ["hello", 2]):
            with self.subTest(texts=str(texts)), self.assertRaises(ValueError):
                analyze_batch_v6(texts)

    def test_deterministic_results(self):
        texts = ["Explain this process.", "Why is it late?"]
        self.assertEqual(analyze_batch_v6(texts), analyze_batch_v6(texts))
