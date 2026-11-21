import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from languages.en.evaluation.proofreading_holdout_report_v1 import (
    evaluate_independent_proofreading_holdout_v1,
)
from languages.en.evaluation.proofreading_quality_gate_v1 import ProofreadingThresholdsV1


class IndependentProofreadingHoldoutV1Tests(unittest.TestCase):
    def test_report_has_fifteen_cases(self):
        self.assertEqual(evaluate_independent_proofreading_holdout_v1()["cases"], 15)

    def test_fingerprint_deterministic(self):
        first = evaluate_independent_proofreading_holdout_v1()
        second = evaluate_independent_proofreading_holdout_v1()
        self.assertEqual(first["dataset_sha256"], second["dataset_sha256"])

    def test_report_is_not_training(self):
        self.assertFalse(evaluate_independent_proofreading_holdout_v1()["training_performed"])

    def test_no_deployment(self):
        self.assertFalse(evaluate_independent_proofreading_holdout_v1()["deployment_approved"])

    def test_no_release(self):
        self.assertFalse(evaluate_independent_proofreading_holdout_v1()["release_authorized"])

    def test_no_secrecy_claim(self):
        self.assertFalse(evaluate_independent_proofreading_holdout_v1()["holdout_secrecy_guaranteed"])

    def test_no_generalization_claim(self):
        self.assertFalse(evaluate_independent_proofreading_holdout_v1()["generalization_verified"])

    def test_labels_not_engine_generated(self):
        self.assertFalse(evaluate_independent_proofreading_holdout_v1()["labels_derived_from_engine"])

    def test_bad_path(self):
        with self.assertRaises(ValueError):
            evaluate_independent_proofreading_holdout_v1(path="not-a-path")

    def test_missing_file(self):
        with self.assertRaises(FileNotFoundError):
            evaluate_independent_proofreading_holdout_v1(path=Path("/not-present-xsus-holdout.jsonl"))

    def test_malformed_dataset_rejected(self):
        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "cases.jsonl"
            path.write_text("not json\n")
            with self.assertRaises(ValueError):
                evaluate_independent_proofreading_holdout_v1(path=path)

    def test_duplicate_case_ids_rejected(self):
        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "cases.jsonl"
            item = {"id": "same", "input": "The files are ready.", "status": "unchanged",
                    "output": "The files are ready."}
            path.write_text(json.dumps(item)+"\n"+json.dumps(item)+"\n")
            with self.assertRaises(ValueError):
                evaluate_independent_proofreading_holdout_v1(path=path)

    def test_stricter_minimum_fails_closed(self):
        report = evaluate_independent_proofreading_holdout_v1(
            thresholds=ProofreadingThresholdsV1(min_cases=100)
        )
        self.assertFalse(report["passed"])

    def test_statuses_present(self):
        report = evaluate_independent_proofreading_holdout_v1()
        self.assertIn("corrected", report["by_status"])
        self.assertIn("unchanged", report["by_status"])
        self.assertIn("review_required", report["by_status"])

    def test_failure_list_present(self):
        self.assertIsInstance(evaluate_independent_proofreading_holdout_v1()["failures"], list)
