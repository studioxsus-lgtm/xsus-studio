import json
from hashlib import sha256
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest

from languages.en.evaluation.proofreading_snapshot_comparison_v1 import compare_proofreading_snapshot_v1
from languages.en.evaluation.proofreading_prediction_artifact_v1 import verify_proofreading_prediction_artifact_v1


def engine(fix=False):
    def run(text):
        if fix and text == "I is ready.":
            return SimpleNamespace(status="corrected", text="I am ready.")
        return SimpleNamespace(status="unchanged", text=text)
    return run


class SnapshotComparisonV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "cases.jsonl"
        self.key = b"s" * 32
        self.rows = [
            {"id": "a", "input": "I is ready.", "status": "corrected", "output": "I am ready."},
            {"id": "b", "input": "The files are ready.", "status": "unchanged", "output": "The files are ready."},
        ]
        self.path.write_text("".join(json.dumps(row)+"\n" for row in self.rows))
        self.digest = sha256(self.path.read_bytes()).hexdigest()

    def compare(self, **kwargs):
        return compare_proofreading_snapshot_v1(
            self.path, self.digest, self.key,
            baseline_engine=engine(False), candidate_engine=engine(True), **kwargs
        )

    def test_improvement(self):
        self.assertEqual(self.compare()["improvements"], ["a"])

    def test_no_regressions(self):
        self.assertEqual(self.compare()["regressions"], [])

    def test_pass(self):
        self.assertTrue(self.compare()["passed"])

    def test_accuracy(self):
        self.assertEqual(self.compare()["candidate_accuracy"], 1.0)

    def test_baseline_accuracy(self):
        self.assertEqual(self.compare()["baseline_accuracy"], 0.5)

    def test_one_snapshot(self):
        self.assertTrue(self.compare()["single_snapshot_used"])

    def test_digest_checked(self):
        self.assertTrue(self.compare()["trusted_digest_checked"])

    def test_invalid_digest(self):
        with self.assertRaises(ValueError):
            compare_proofreading_snapshot_v1(self.path, "0"*64, self.key)

    def test_changed_file_during_execution_does_not_change_snapshot(self):
        def changing_engine(text):
            self.path.write_text("tampered")
            return SimpleNamespace(status="unchanged", text=text)
        result = self.compare(baseline_engine=changing_engine)
        self.assertEqual(result["case_count"], 2)

    def test_inputs_only(self):
        seen = []
        def collect(text):
            seen.append(text)
            return SimpleNamespace(status="unchanged", text=text)
        self.compare(baseline_engine=collect, candidate_engine=collect)
        self.assertEqual(seen, [x["input"] for x in self.rows for _ in range(2)])

    def test_signed_artifacts(self):
        result = self.compare()
        for field in ("reference_artifact", "baseline_artifact", "candidate_artifact"):
            self.assertEqual(len(verify_proofreading_prediction_artifact_v1(result[field], self.key)), 2)

    def test_thresholds(self):
        self.assertFalse(self.compare(min_improvements=2)["passed"])

    def test_regression(self):
        result = self.compare(baseline_engine=engine(True), candidate_engine=engine(False))
        self.assertEqual(result["regressions"], ["a"])

    def test_invalid_engine(self):
        with self.assertRaises(ValueError):
            self.compare(candidate_engine=None)

    def test_limit(self):
        with self.assertRaises(ValueError):
            self.compare(max_cases=1)

    def test_no_release(self):
        self.assertFalse(self.compare()["release_authorized"])

    def test_no_attestation(self):
        self.assertFalse(self.compare()["model_identity_attested"])

    def test_no_independent_labels_claim(self):
        self.assertFalse(self.compare()["reference_label_independence_proven"])

    def test_wrong_key(self):
        with self.assertRaises(ValueError):
            compare_proofreading_snapshot_v1(self.path, self.digest, b"short")

    def test_missing_file(self):
        with self.assertRaises(FileNotFoundError):
            compare_proofreading_snapshot_v1(Path(self.tmp.name)/"missing", self.digest, self.key)
