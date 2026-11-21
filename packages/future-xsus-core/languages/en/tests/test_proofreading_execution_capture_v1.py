import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from types import SimpleNamespace

from languages.en.evaluation.proofreading_execution_capture_v1 import capture_proofreading_execution_v1
from languages.en.evaluation.proofreading_prediction_artifact_v1 import verify_proofreading_prediction_artifact_v1


class ProofreadingExecutionCaptureV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "cases.jsonl"
        self.key = b"e"*32
        self.rows = [
            {"id": "a", "input": "The files are ready.", "status": "unchanged", "output": "The files are ready."},
            {"id": "b", "input": "I is ready.", "status": "corrected", "output": "I am ready."},
        ]
        self.path.write_text("".join(json.dumps(r)+"\n" for r in self.rows))

    def capture(self, **kwargs):
        return capture_proofreading_execution_v1(self.path, "engine-v1", self.key, **kwargs)

    def test_actual_engine_called(self):
        seen = []
        def engine(value):
            seen.append(value)
            return SimpleNamespace(status="unchanged", text=value)
        self.capture(engine=engine)
        self.assertEqual(seen, [r["input"] for r in self.rows])

    def test_labels_not_sent(self):
        seen = []
        def engine(value):
            seen.append(value)
            return SimpleNamespace(status="unchanged", text=value)
        self.capture(engine=engine)
        self.assertNotIn("corrected", seen)

    def test_signed_artifact_verifies(self):
        artifact = self.capture()["artifact"]
        self.assertEqual(len(verify_proofreading_prediction_artifact_v1(artifact, self.key)), 2)

    def test_version_recorded(self):
        self.assertEqual(self.capture()["artifact"]["version"], "engine-v1")

    def test_digest_recorded(self):
        self.assertEqual(len(self.capture()["artifact"]["dataset_sha256"]), 64)

    def test_case_count(self):
        self.assertEqual(self.capture()["executed_case_count"], 2)

    def test_engine_identity_not_attested(self):
        self.assertFalse(self.capture()["engine_identity_attested"])

    def test_no_release(self):
        self.assertFalse(self.capture()["release_authorized"])

    def test_no_label_inference(self):
        self.assertFalse(self.capture()["labels_used_for_inference"])

    def test_duplicate_rejected(self):
        self.path.write_text(json.dumps(self.rows[0])+"\n"+json.dumps(self.rows[0])+"\n")
        with self.assertRaises(ValueError):
            self.capture()

    def test_malformed_rejected(self):
        self.path.write_text("not json\n")
        with self.assertRaises(ValueError):
            self.capture()

    def test_blank_rejected(self):
        self.path.write_text("\n")
        with self.assertRaises(ValueError):
            self.capture()

    def test_empty_rejected(self):
        self.path.write_text("")
        with self.assertRaises(ValueError):
            self.capture()

    def test_limit_rejected(self):
        with self.assertRaises(ValueError):
            self.capture(max_cases=1)

    def test_boolean_limit_rejected(self):
        with self.assertRaises(ValueError):
            self.capture(max_cases=True)

    def test_bad_engine_rejected(self):
        with self.assertRaises(ValueError):
            self.capture(engine=123)

    def test_wrong_key_rejected(self):
        with self.assertRaises(ValueError):
            capture_proofreading_execution_v1(self.path, "v1", b"short")

    def test_missing_file(self):
        with self.assertRaises(FileNotFoundError):
            capture_proofreading_execution_v1(Path(self.tmp.name)/"missing", "v1", self.key)

    def test_missing_field_rejected(self):
        row = dict(self.rows[0])
        del row["output"]
        self.path.write_text(json.dumps(row)+"\n")
        with self.assertRaises(ValueError):
            self.capture()

    def test_invalid_engine_result_rejected(self):
        with self.assertRaises(ValueError):
            self.capture(engine=lambda text: SimpleNamespace(status=1, text=text))

    def test_forged_label_does_not_change_observed(self):
        def engine(value):
            return SimpleNamespace(status="unchanged", text=value)
        before = self.capture(engine=engine)["artifact"]["predictions"]
        self.rows[0]["output"] = "forged reference"
        self.path.write_text("".join(json.dumps(r)+"\n" for r in self.rows))
        after = self.capture(engine=engine)["artifact"]["predictions"]
        self.assertEqual(before, after)
