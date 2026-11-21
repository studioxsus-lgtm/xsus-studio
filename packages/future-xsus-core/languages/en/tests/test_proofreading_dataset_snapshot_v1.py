import json
from hashlib import sha256
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from languages.en.evaluation.proofreading_dataset_snapshot_v1 import (
    ProofreadingDatasetSnapshotV1,
    load_proofreading_dataset_snapshot_v1 as load,
    verify_proofreading_dataset_snapshot_v1 as verify,
)


class DatasetSnapshotV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "cases.jsonl"
        self.rows = [
            {"id": "a", "input": "I is ready.", "status": "corrected", "output": "I am ready."},
            {"id": "b", "input": "The files are ready.", "status": "unchanged", "output": "The files are ready."},
        ]
        self.path.write_text("".join(json.dumps(x)+"\n" for x in self.rows))

    def test_load(self):
        self.assertEqual(len(load(self.path).rows), 2)

    def test_digest(self):
        self.assertEqual(load(self.path).digest, sha256(self.path.read_bytes()).hexdigest())

    def test_trusted_digest(self):
        snapshot = load(self.path)
        self.assertTrue(verify(snapshot, snapshot.digest))

    def test_wrong_trusted_digest(self):
        snapshot = load(self.path)
        with self.assertRaises(ValueError):
            verify(snapshot, "a"*64 if snapshot.digest != "a"*64 else "b"*64)

    def test_immutable_snapshot(self):
        snapshot = load(self.path)
        self.path.write_text("corrupted")
        self.assertEqual(len(snapshot.rows), 2)

    def test_modified_snapshot_digest(self):
        snapshot = load(self.path)
        forged = ProofreadingDatasetSnapshotV1(snapshot.raw, "a"*64, snapshot.rows)
        with self.assertRaises(ValueError):
            verify(forged, snapshot.digest)

    def test_empty(self):
        self.path.write_text("")
        with self.assertRaises(ValueError):
            load(self.path)

    def test_malformed(self):
        self.path.write_text("bad json")
        with self.assertRaises(ValueError):
            load(self.path)

    def test_duplicate(self):
        self.path.write_text(json.dumps(self.rows[0])+"\n"+json.dumps(self.rows[0])+"\n")
        with self.assertRaises(ValueError):
            load(self.path)

    def test_blank_line(self):
        self.path.write_text("\n")
        with self.assertRaises(ValueError):
            load(self.path)

    def test_invalid_status(self):
        self.rows[0]["status"] = "unknown"
        self.path.write_text(json.dumps(self.rows[0])+"\n")
        with self.assertRaises(ValueError):
            load(self.path)

    def test_missing_field(self):
        del self.rows[0]["output"]
        self.path.write_text(json.dumps(self.rows[0])+"\n")
        with self.assertRaises(ValueError):
            load(self.path)

    def test_limit_cases(self):
        with self.assertRaises(ValueError):
            load(self.path, max_cases=1)

    def test_limit_bytes(self):
        with self.assertRaises(ValueError):
            load(self.path, max_bytes=2)

    def test_boolean_limit(self):
        with self.assertRaises(ValueError):
            load(self.path, max_cases=True)

    def test_missing_path(self):
        with self.assertRaises(FileNotFoundError):
            load(Path(self.tmp.name)/"missing")

    def test_invalid_trusted_hash(self):
        with self.assertRaises(ValueError):
            verify(load(self.path), "not-a-hash")

    def test_invalid_snapshot(self):
        with self.assertRaises(ValueError):
            verify({}, "a"*64)

    def test_rows_are_tuples(self):
        self.assertIsInstance(load(self.path).rows, tuple)

    def test_raw_bytes_stable(self):
        snapshot = load(self.path)
        self.assertEqual(snapshot.raw, self.path.read_bytes())
