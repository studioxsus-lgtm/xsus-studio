"""Benchmark contract, score arithmetic, adversarial input, privacy."""
import json
import tempfile
import unittest
from pathlib import Path

from languages.en.evaluation.word_sense_benchmark_v1 import evaluate_word_sense


class WordSenseBenchmarkTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "holdout.jsonl"

    def write(self, rows):
        self.path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")

    def row(self, identifier, text, target, expected):
        return {"id": identifier, "text": text, "target": target, "expected_sense": expected}

    def test_packaged_holdout_has_cases(self):
        report = evaluate_word_sense()
        self.assertGreaterEqual(report["cases"], 30)
        self.assertGreater(report["labeled_cases"], 0)
        self.assertGreater(report["expected_abstentions"], 0)

    def test_all_metrics_consistent(self):
        report = evaluate_word_sense()
        self.assertEqual(report["cases"], report["resolved_cases"] +
                         report["true_abstentions"] + report["missed_senses"])
        self.assertEqual(report["labeled_cases"], report["correct_senses"] +
                         report["wrong_senses"] + report["missed_senses"])
        self.assertEqual(report["expected_abstentions"], report["true_abstentions"] +
                         report["false_resolutions"])
        self.assertEqual(report["resolved_cases"], report["correct_senses"] +
                         report["wrong_senses"] + report["false_resolutions"])

    def test_known_correct_and_abstention(self):
        self.write([
            self.row("a", "A river bank was flooded.", "bank", "river_edge"),
            self.row("b", "I went to the bank.", "bank", None),
        ])
        report = evaluate_word_sense(self.path)
        self.assertEqual(report["correct_senses"], 1)
        self.assertEqual(report["true_abstentions"], 1)
        self.assertEqual(report["coverage"], 0.5)
        self.assertEqual(report["resolved_precision"], 1.0)

    def test_wrong_resolution_is_counted(self):
        self.write([self.row("a", "The river bank is wet.", "bank", "financial_institution")])
        report = evaluate_word_sense(self.path)
        self.assertEqual(report["wrong_senses"], 1)
        self.assertEqual(report["correct_senses"], 0)

    def test_false_resolution_is_counted(self):
        self.write([self.row("a", "The river bank is wet.", "bank", None)])
        self.assertEqual(evaluate_word_sense(self.path)["false_resolutions"], 1)

    def test_missing_cue_is_counted(self):
        self.write([self.row("a", "I visited the bank.", "bank", "river_edge")])
        self.assertEqual(evaluate_word_sense(self.path)["missed_senses"], 1)

    def test_no_raw_input_exposed(self):
        self.write([self.row("secret", "My bank account has SECRET-987.", "bank", "financial_institution")])
        serialized = json.dumps(evaluate_word_sense(self.path))
        self.assertNotIn("SECRET-987", serialized)
        self.assertNotIn("My bank", serialized)
        self.assertNotIn("secret", serialized)

    def test_no_training_or_release_claims(self):
        report = evaluate_word_sense()
        self.assertFalse(report["weights_retrained"])
        self.assertFalse(report["release_authorized"])
        self.assertFalse(report["open_domain_understanding_proven"])
        self.assertFalse(report["independent_external_holdout_proven"])

    def test_duplicate_id_rejected(self):
        self.write([self.row("a", "river bank", "bank", "river_edge")] * 2)
        with self.assertRaises(ValueError):
            evaluate_word_sense(self.path)

    def test_unsupported_expected_sense_rejected(self):
        self.write([self.row("a", "river bank", "bank", "impossible")])
        with self.assertRaises(ValueError):
            evaluate_word_sense(self.path)

    def test_invalid_schema_rejected(self):
        self.write([{"id": "a", "text": "river bank", "target": "bank"}])
        with self.assertRaises(ValueError):
            evaluate_word_sense(self.path)

    def test_empty_file_rejected(self):
        self.path.write_text("", encoding="utf-8")
        with self.assertRaises(ValueError):
            evaluate_word_sense(self.path)

    def test_unsupported_target_rejected(self):
        self.write([self.row("a", "apple tree", "apple", None)])
        with self.assertRaises(ValueError):
            evaluate_word_sense(self.path)


if __name__ == "__main__":
    unittest.main()
