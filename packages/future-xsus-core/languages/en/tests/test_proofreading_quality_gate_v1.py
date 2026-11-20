import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from languages.en.evaluation.proofreading_quality_gate_v1 import (
    ProofreadingThresholdsV1, evaluate_proofreading_quality_gate_v1,
)
from languages.en.text.editing.proofreader import proofread_sentence


class ProofreadingQualityGateV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "cases.jsonl"

    def write_cases(self, sentences):
        with self.path.open("w", encoding="utf-8") as stream:
            for index, sentence in enumerate(sentences):
                result = proofread_sentence(sentence)
                stream.write(json.dumps({
                    "id": f"case-{index}", "input": sentence,
                    "status": result.status, "output": result.text,
                }) + "\n")

    def run_gate(self, **kwargs):
        return evaluate_proofreading_quality_gate_v1(self.path, **kwargs)

    def test_ten_labeled_cases_pass(self):
        self.write_cases(["He go to school."] * 10)
        self.assertTrue(self.run_gate()["passed"])

    def test_exact_match_one(self):
        self.write_cases(["She writes a report."] * 10)
        self.assertEqual(self.run_gate()["exact_match"], 1.0)

    def test_minimum_cases_enforced(self):
        self.write_cases(["He writes."])
        self.assertFalse(self.run_gate()["passed"])

    def test_minimum_cases_override(self):
        self.write_cases(["He writes."])
        self.assertTrue(self.run_gate(thresholds=ProofreadingThresholdsV1(min_cases=1))["passed"])

    def test_mismatched_output_fails(self):
        self.write_cases(["He writes."] * 10)
        lines = self.path.read_text().splitlines()
        row = json.loads(lines[0])
        row["output"] = "A completely different sentence."
        lines[0] = json.dumps(row)
        self.path.write_text("\n".join(lines) + "\n")
        self.assertFalse(self.run_gate()["passed"])

    def test_failure_diagnostics(self):
        self.write_cases(["He writes."] * 10)
        lines = self.path.read_text().splitlines()
        row = json.loads(lines[0])
        row["output"] = "A completely different sentence."
        lines[0] = json.dumps(row)
        self.path.write_text("\n".join(lines) + "\n")
        self.assertEqual(self.run_gate()["failures"][0]["id"], "case-0")

    def test_relaxed_failure_threshold(self):
        self.write_cases(["He writes."] * 10)
        lines = self.path.read_text().splitlines()
        row = json.loads(lines[0])
        row["output"] = "A completely different sentence."
        lines[0] = json.dumps(row)
        self.path.write_text("\n".join(lines) + "\n")
        thresholds = ProofreadingThresholdsV1(10, 0.9, 1)
        self.assertTrue(self.run_gate(thresholds=thresholds)["passed"])

    def test_wrong_threshold_type(self):
        self.write_cases(["He writes."] * 10)
        with self.assertRaises(ValueError):
            self.run_gate(thresholds={})

    def test_boolean_min_cases_rejected(self):
        self.write_cases(["He writes."] * 10)
        with self.assertRaises(ValueError):
            self.run_gate(thresholds=ProofreadingThresholdsV1(min_cases=True))

    def test_accuracy_over_one_rejected(self):
        self.write_cases(["He writes."] * 10)
        with self.assertRaises(ValueError):
            self.run_gate(thresholds=ProofreadingThresholdsV1(min_exact_match=1.1))

    def test_negative_failures_rejected(self):
        self.write_cases(["He writes."] * 10)
        with self.assertRaises(ValueError):
            self.run_gate(thresholds=ProofreadingThresholdsV1(max_failures=-1))

    def test_path_required(self):
        with self.assertRaises(ValueError):
            evaluate_proofreading_quality_gate_v1("cases.jsonl")

    def test_mode_flag_type(self):
        self.write_cases(["He writes."] * 10)
        with self.assertRaises(ValueError):
            self.run_gate(copyedit=1)

    def test_missing_file(self):
        with self.assertRaises(FileNotFoundError):
            self.run_gate()

    def test_duplicate_ids_rejected(self):
        self.write_cases(["He writes."] * 10)
        lines = self.path.read_text().splitlines()
        lines[1] = lines[0]
        self.path.write_text("\n".join(lines) + "\n")
        with self.assertRaises(ValueError):
            self.run_gate()

    def test_empty_file_rejected(self):
        self.path.write_text("")
        with self.assertRaises(ValueError):
            self.run_gate()

    def test_no_training(self):
        self.write_cases(["He writes."] * 10)
        self.assertFalse(self.run_gate()["training_performed"])

    def test_no_deployment(self):
        self.write_cases(["He writes."] * 10)
        self.assertFalse(self.run_gate()["deployment_approved"])

    def test_no_general_accuracy_claim(self):
        self.write_cases(["He writes."] * 10)
        self.assertFalse(self.run_gate()["general_language_accuracy_verified"])

    def test_thresholds_in_report(self):
        self.write_cases(["He writes."] * 10)
        self.assertEqual(self.run_gate()["thresholds"]["min_cases"], 10)
