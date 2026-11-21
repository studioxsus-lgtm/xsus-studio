import tempfile
import unittest
from dataclasses import replace
from pathlib import Path
from languages.en.learning.candidate_artifact_inspection_v1 import (
    CandidateArtifactInspectionRequestV1 as Request,
    inspect_candidate_artifacts_v1 as inspect,
)


class CandidateArtifactInspectionV1Tests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root=Path(self.temp.name)
        self.request=Request(root/"report.json",root/"candidate.json",root/"train.jsonl")

    def test_missing_files(self):
        self.assertFalse(inspect(self.request)["all_present"])

    def test_missing_status(self):
        self.assertEqual(inspect(self.request)["artifacts"]["report"]["status"],"missing")

    def test_present(self):
        for p in (self.request.report_path,self.request.candidate_path,self.request.training_path):
            p.write_bytes(b"sample")
        self.assertTrue(inspect(self.request)["all_present"])

    def test_sha256(self):
        self.request.report_path.write_bytes(b"sample")
        self.assertEqual(len(inspect(self.request)["artifacts"]["report"]["sha256"]),64)

    def test_size(self):
        self.request.report_path.write_bytes(b"123")
        self.assertEqual(inspect(self.request)["artifacts"]["report"]["size"],3)

    def test_oversized(self):
        self.request.report_path.write_bytes(b"1234")
        result=inspect(replace(self.request,max_bytes_per_artifact=3))
        self.assertEqual(result["artifacts"]["report"]["status"],"oversized")

    def test_symlink(self):
        target=self.request.training_path
        target.write_bytes(b"sample")
        self.request.report_path.symlink_to(target)
        self.assertEqual(inspect(self.request)["artifacts"]["report"]["status"],"unsafe")

    def test_directory(self):
        self.request.report_path.mkdir()
        self.assertEqual(inspect(self.request)["artifacts"]["report"]["status"],"unsafe")

    def test_duplicate_path(self):
        with self.assertRaises(ValueError):
            inspect(replace(self.request,candidate_path=self.request.report_path))

    def test_invalid_limit(self):
        with self.assertRaises(ValueError):
            inspect(replace(self.request,max_bytes_per_artifact=0))

    def test_boolean_limit(self):
        with self.assertRaises(ValueError):
            inspect(replace(self.request,max_bytes_per_artifact=True))

    def test_wrong_request(self):
        with self.assertRaises(ValueError):
            inspect(None)

    def test_wrong_path(self):
        with self.assertRaises(ValueError):
            inspect(replace(self.request,training_path="train.jsonl"))

    def test_no_release(self):
        self.assertFalse(inspect(self.request)["release_authorized"])

    def test_no_resume(self):
        self.assertFalse(inspect(self.request)["automatic_resume_authorized"])

    def test_no_quality_claim(self):
        self.assertFalse(inspect(self.request)["model_quality_verified"])

    def test_no_provenance_claim(self):
        self.assertFalse(inspect(self.request)["artifact_provenance_verified"])

    def test_review_required(self):
        self.assertTrue(inspect(self.request)["requires_manual_review"])

    def test_does_not_create_files(self):
        inspect(self.request)
        self.assertFalse(self.request.report_path.exists())

    def test_different_content_different_hash(self):
        self.request.report_path.write_bytes(b"a")
        first=inspect(self.request)["artifacts"]["report"]["sha256"]
        self.request.report_path.write_bytes(b"b")
        second=inspect(self.request)["artifacts"]["report"]["sha256"]
        self.assertNotEqual(first,second)
