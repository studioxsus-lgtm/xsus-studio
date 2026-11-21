import json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest

from languages.en.evaluation.proofreading_execution_comparison_v1 import compare_proofreading_executions_v1
from languages.en.evaluation.proofreading_prediction_artifact_v1 import verify_proofreading_prediction_artifact_v1


def engine(correct=False):
    def run(text):
        if correct and text == "I is ready.":
            return SimpleNamespace(status="corrected", text="I am ready.")
        return SimpleNamespace(status="unchanged", text=text)
    return run


class ExecutionComparisonV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "cases.jsonl"
        self.key = b"z" * 32
        self.rows = [
            {"id": "a", "input": "I is ready.", "status": "corrected", "output": "I am ready."},
            {"id": "b", "input": "The files are ready.", "status": "unchanged", "output": "The files are ready."},
        ]
        self.path.write_text("".join(json.dumps(row) + "\n" for row in self.rows))

    def compare(self, **kwargs):
        return compare_proofreading_executions_v1(
            self.path, self.key, baseline_engine=engine(False),
            candidate_engine=engine(True), **kwargs
        )

    def test_improvement_detected(self):
        self.assertEqual(self.compare()["improvements"], ["a"])

    def test_no_regression(self):
        self.assertEqual(self.compare()["regressions"], [])

    def test_comparison_passes(self):
        self.assertTrue(self.compare()["passed"])

    def test_baseline_accuracy(self):
        self.assertEqual(self.compare()["baseline_accuracy"], 0.5)

    def test_candidate_accuracy(self):
        self.assertEqual(self.compare()["candidate_accuracy"], 1.0)

    def test_minimum_improvement(self):
        self.assertTrue(self.compare(min_improvements=1)["passed"])

    def test_too_many_improvements_required(self):
        self.assertFalse(self.compare(min_improvements=2)["passed"])

    def test_three_artifacts_verifiable(self):
        result = self.compare()
        for name in ("reference_artifact", "baseline_artifact", "candidate_artifact"):
            self.assertEqual(len(verify_proofreading_prediction_artifact_v1(result[name], self.key)), 2)

    def test_fingerprint_equal(self):
        result = self.compare()
        self.assertEqual(result["reference_artifact"]["dataset_sha256"],
                         result["candidate_artifact"]["dataset_sha256"])

    def test_no_release(self):
        self.assertFalse(self.compare()["release_authorized"])

    def test_no_attestation_claim(self):
        self.assertFalse(self.compare()["model_identity_attested"])

    def test_no_secrecy_claim(self):
        self.assertFalse(self.compare()["dataset_secrecy_verified"])

    def test_invalid_key(self):
        with self.assertRaises(ValueError):
            compare_proofreading_executions_v1(self.path, b"short")

    def test_duplicate_ids(self):
        self.path.write_text(json.dumps(self.rows[0]) + "\n" + json.dumps(self.rows[0]) + "\n")
        with self.assertRaises(ValueError):
            self.compare()

    def test_invalid_engine(self):
        with self.assertRaises(ValueError):
            compare_proofreading_executions_v1(self.path, self.key, candidate_engine=123)

    def test_missing_file(self):
        with self.assertRaises(FileNotFoundError):
            compare_proofreading_executions_v1(Path(self.tmp.name)/"missing", self.key)

    def test_limit(self):
        with self.assertRaises(ValueError):
            self.compare(max_cases=1)

    def test_real_default_engine(self):
        result = compare_proofreading_executions_v1(self.path, self.key)
        self.assertEqual(result["case_count"], 2)

    def test_regression_detected(self):
        result = compare_proofreading_executions_v1(
            self.path, self.key, baseline_engine=engine(True),
            candidate_engine=engine(False),
        )
        self.assertEqual(result["regressions"], ["a"])
        self.assertFalse(result["passed"])

    def test_labels_not_sent_to_engines(self):
        inputs = []
        def capture(text):
            inputs.append(text)
            return SimpleNamespace(status="unchanged", text=text)
        compare_proofreading_executions_v1(
            self.path, self.key, baseline_engine=capture, candidate_engine=capture
        )
        self.assertEqual(inputs, [r["input"] for r in self.rows] * 2)
