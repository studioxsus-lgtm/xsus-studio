"""Phase 3 action semantics benchmark contracts."""
import json
from pathlib import Path
import tempfile
import unittest

from languages.en.evaluation.action_semantics_benchmark_v1 import evaluate_action_semantics


class ActionBenchmarkTests(unittest.TestCase):
    def test_authored_holdout(self):
        result = evaluate_action_semantics()
        self.assertEqual(result["cases"], 32)
        self.assertEqual(result["labeled_cases"], 22)
        self.assertEqual(result["expected_abstentions"], 10)
        self.assertEqual(result["correct"], 22)
        self.assertEqual(result["wrong"], 0)
        self.assertEqual(result["missed"], 0)
        self.assertEqual(result["true_abstentions"], 10)
        self.assertEqual(result["false_resolutions"], 0)

    def test_privacy_and_scope(self):
        result = evaluate_action_semantics()
        self.assertFalse(result["raw_text_exposed"])
        self.assertFalse(result["production_authorized"])
        self.assertFalse(result["independent_external_holdout_proven"])

    def test_empty_holdout_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "empty.jsonl"
            path.write_text("", encoding="utf-8")
            with self.assertRaises(ValueError):
                evaluate_action_semantics(path)

    def test_duplicate_id_rejected(self):
        row = json.dumps({"id": "duplicate", "sentence": "She reads the report.",
                          "expected_category": "information_access"})
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "duplicate.jsonl"
            path.write_text(row + "\n" + row + "\n", encoding="utf-8")
            with self.assertRaises(ValueError):
                evaluate_action_semantics(path)


if __name__ == "__main__":
    unittest.main()
