"""Sentence-frame diagnostic benchmark contract."""
import json
from pathlib import Path
import tempfile
import unittest

from languages.en.evaluation.sentence_meaning_benchmark_v1 import evaluate_sentence_frames


class SentenceBenchmarkTests(unittest.TestCase):
    def test_authored_holdout(self):
        report = evaluate_sentence_frames()
        self.assertEqual(report["cases"], 32)
        self.assertEqual(report["labeled_cases"], 20)
        self.assertEqual(report["expected_abstentions"], 12)
        self.assertEqual(report["correct_frames"], 20)
        self.assertEqual(report["wrong_frames"], 0)
        self.assertEqual(report["missed_frames"], 0)
        self.assertEqual(report["false_resolutions"], 0)
        self.assertEqual(report["true_abstentions"], 12)

    def test_no_raw_text_or_production_claim(self):
        report = evaluate_sentence_frames()
        self.assertNotIn("The developer builds", repr(report))
        self.assertFalse(report["raw_text_exposed"])
        self.assertFalse(report["production_authorized"])
        self.assertFalse(report["independent_external_holdout_proven"])

    def test_duplicate_ids_rejected(self):
        row = json.dumps({"id": "duplicate", "text": "She reads the report.",
                          "expected": {"subject": "she", "action": "read",
                                       "object": "the report", "polarity": "positive"}})
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "cases.jsonl"
            path.write_text(row + "\n" + row + "\n", encoding="utf-8")
            with self.assertRaises(ValueError):
                evaluate_sentence_frames(path)

    def test_empty_dataset_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "cases.jsonl"
            path.write_text("", encoding="utf-8")
            with self.assertRaises(ValueError):
                evaluate_sentence_frames(path)


if __name__ == "__main__":
    unittest.main()
