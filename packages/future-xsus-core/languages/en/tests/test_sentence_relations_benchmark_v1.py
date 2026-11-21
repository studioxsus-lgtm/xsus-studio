"""Sentence relation benchmark regression and malformed input tests."""
import json
from pathlib import Path
import tempfile
import unittest

from languages.en.evaluation.sentence_relations_benchmark_v1 import evaluate_sentence_relations


class SentenceRelationsBenchmarkTests(unittest.TestCase):
    def test_24_case_diagnostic(self):
        result = evaluate_sentence_relations()
        self.assertEqual(result["cases"], 24)
        self.assertEqual(result["labeled_cases"], 16)
        self.assertEqual(result["expected_abstentions"], 8)
        self.assertEqual(result["correct"], 16)
        self.assertEqual(result["wrong"], 0)
        self.assertEqual(result["missed"], 0)
        self.assertEqual(result["true_abstentions"], 8)
        self.assertEqual(result["false_resolutions"], 0)

    def test_no_raw_text_and_no_release_claim(self):
        result = evaluate_sentence_relations()
        self.assertNotIn("She reads the report.", repr(result))
        self.assertFalse(result["production_authorized"])
        self.assertFalse(result["independent_external_holdout_proven"])
        self.assertFalse(result["logical_contradiction_proven"])

    def test_empty_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "cases.jsonl"
            path.write_text("", encoding="utf-8")
            with self.assertRaises(ValueError):
                evaluate_sentence_relations(path)

    def test_duplicate_id_rejected(self):
        row = json.dumps({"id": "same", "first": "She reads the report.",
                          "second": "She reads the report.",
                          "expected_relation": "same_explicit_frame"})
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "cases.jsonl"
            path.write_text(row + "\n" + row + "\n", encoding="utf-8")
            with self.assertRaises(ValueError):
                evaluate_sentence_relations(path)


if __name__ == "__main__":
    unittest.main()
