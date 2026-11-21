import copy
import tempfile
import unittest
from pathlib import Path
from languages.en.learning.candidate_artifact_inspection_v1 import CandidateArtifactInspectionRequestV1 as Request
from languages.en.learning.candidate_artifact_manifest_v1 import (
    build_candidate_artifact_manifest_v1 as build,
    verify_candidate_artifact_manifest_v1 as verify,
)


class CandidateArtifactManifestV1Tests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root=Path(self.temp.name)
        self.request=Request(root/"report.json",root/"candidate.json",root/"train.jsonl")
        for path in (self.request.report_path,self.request.candidate_path,self.request.training_path):
            path.write_bytes(path.name.encode())
        self.manifest=build(self.request)

    def test_manifest_contract(self):
        self.assertEqual(self.manifest["contract"],"future-xsus-core.candidate-artifact-manifest.v1")

    def test_three_artifacts(self):
        self.assertEqual(len(self.manifest["artifacts"]),3)

    def test_manifest_checksum(self):
        self.assertEqual(len(self.manifest["manifest_sha256"]),64)

    def test_verify_original(self):
        self.assertTrue(verify(self.request,self.manifest)["artifact_digests_match"])

    def test_manifest_consistent(self):
        self.assertTrue(verify(self.request,self.manifest)["manifest_consistent"])

    def test_changed_candidate(self):
        self.request.candidate_path.write_bytes(b"changed")
        self.assertFalse(verify(self.request,self.manifest)["artifact_digests_match"])

    def test_changed_report(self):
        self.request.report_path.write_bytes(b"changed")
        self.assertFalse(verify(self.request,self.manifest)["artifact_digests_match"])

    def test_changed_training(self):
        self.request.training_path.write_bytes(b"changed")
        self.assertFalse(verify(self.request,self.manifest)["artifact_digests_match"])

    def test_missing_candidate(self):
        self.request.candidate_path.unlink()
        self.assertFalse(verify(self.request,self.manifest)["artifact_digests_match"])

    def test_modified_checksum(self):
        bad=copy.deepcopy(self.manifest)
        bad["manifest_sha256"]="0"*64
        self.assertFalse(verify(self.request,bad)["manifest_consistent"])

    def test_modified_record(self):
        bad=copy.deepcopy(self.manifest)
        bad["artifacts"]["candidate"]["size"]+=1
        self.assertFalse(verify(self.request,bad)["artifact_digests_match"])

    def test_extra_field(self):
        bad=copy.deepcopy(self.manifest)
        bad["extra"]=True
        with self.assertRaises(ValueError):
            verify(self.request,bad)

    def test_bad_contract(self):
        bad=copy.deepcopy(self.manifest)
        bad["contract"]="other"
        with self.assertRaises(ValueError):
            verify(self.request,bad)

    def test_missing_record(self):
        bad=copy.deepcopy(self.manifest)
        del bad["artifacts"]["report"]
        with self.assertRaises(ValueError):
            verify(self.request,bad)

    def test_invalid_digest(self):
        bad=copy.deepcopy(self.manifest)
        bad["artifacts"]["report"]["sha256"]="invalid"
        with self.assertRaises(ValueError):
            verify(self.request,bad)

    def test_invalid_size(self):
        bad=copy.deepcopy(self.manifest)
        bad["artifacts"]["report"]["size"]=-1
        with self.assertRaises(ValueError):
            verify(self.request,bad)

    def test_no_provenance(self):
        self.assertFalse(verify(self.request,self.manifest)["provenance_authenticated"])

    def test_no_release(self):
        self.assertFalse(verify(self.request,self.manifest)["release_authorized"])

    def test_no_quality_claim(self):
        self.assertFalse(verify(self.request,self.manifest)["model_quality_verified"])

    def test_missing_build_rejected(self):
        self.request.report_path.unlink()
        with self.assertRaises(ValueError):
            build(self.request)
