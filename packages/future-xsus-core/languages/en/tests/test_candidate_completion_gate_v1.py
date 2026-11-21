import copy
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path
from languages.en.learning.candidate_completion_gate_v1 import (
    CandidateCompletionGateRequestV1 as Request,
    verify_candidate_completion_gate_v1 as verify,
)
from languages.en.learning.candidate_cycle_journal_v1 import record_candidate_cycle_state_v1 as record
from languages.en.learning.candidate_artifact_inspection_v1 import CandidateArtifactInspectionRequestV1
from languages.en.learning.candidate_artifact_manifest_v1 import build_candidate_artifact_manifest_v1 as build


class CandidateCompletionGateV1Tests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root=Path(self.temp.name)
        self.revision="a"*64
        self.request=Request(root/"report.json",root/"candidate.json",root/"train.jsonl",self.revision)
        for path in (self.request.report_path,self.request.candidate_path,self.request.training_path):
            path.write_bytes(path.name.encode())
        self.manifest=build(CandidateArtifactInspectionRequestV1(
            self.request.report_path,self.request.candidate_path,self.request.training_path))

    def test_completed_ready(self):
        record(self.request.report_path,self.revision,"completed")
        self.assertTrue(verify(self.request,self.manifest)["ready_for_human_review"])

    def test_absent_not_ready(self):
        self.assertFalse(verify(self.request,self.manifest)["ready_for_human_review"])

    def test_running_not_ready(self):
        record(self.request.report_path,self.revision,"running")
        self.assertFalse(verify(self.request,self.manifest)["ready_for_human_review"])

    def test_failed_not_ready(self):
        record(self.request.report_path,self.revision,"failed")
        self.assertFalse(verify(self.request,self.manifest)["ready_for_human_review"])

    def test_interrupted_not_ready(self):
        record(self.request.report_path,self.revision,"interrupted")
        self.assertFalse(verify(self.request,self.manifest)["ready_for_human_review"])

    def test_revision_mismatch(self):
        record(self.request.report_path,"b"*64,"completed")
        self.assertFalse(verify(self.request,self.manifest)["feedback_revision_matches"])

    def test_revision_mismatch_not_ready(self):
        record(self.request.report_path,"b"*64,"completed")
        self.assertFalse(verify(self.request,self.manifest)["ready_for_human_review"])

    def test_modified_candidate(self):
        record(self.request.report_path,self.revision,"completed")
        self.request.candidate_path.write_bytes(b"tampered")
        self.assertFalse(verify(self.request,self.manifest)["ready_for_human_review"])

    def test_modified_report(self):
        record(self.request.report_path,self.revision,"completed")
        self.request.report_path.write_bytes(b"tampered")
        self.assertFalse(verify(self.request,self.manifest)["ready_for_human_review"])

    def test_modified_training(self):
        record(self.request.report_path,self.revision,"completed")
        self.request.training_path.write_bytes(b"tampered")
        self.assertFalse(verify(self.request,self.manifest)["ready_for_human_review"])

    def test_missing_candidate(self):
        record(self.request.report_path,self.revision,"completed")
        self.request.candidate_path.unlink()
        self.assertFalse(verify(self.request,self.manifest)["ready_for_human_review"])

    def test_bad_manifest(self):
        bad=copy.deepcopy(self.manifest)
        bad["manifest_sha256"]="0"*64
        self.assertFalse(verify(self.request,bad)["ready_for_human_review"])

    def test_bad_revision(self):
        with self.assertRaises(ValueError):
            verify(replace(self.request,expected_feedback_revision="bad"),self.manifest)

    def test_invalid_request(self):
        with self.assertRaises(ValueError):
            verify(None,self.manifest)

    def test_invalid_path(self):
        with self.assertRaises(ValueError):
            verify(replace(self.request,report_path="report.json"),self.manifest)

    def test_no_quality_claim(self):
        record(self.request.report_path,self.revision,"completed")
        self.assertFalse(verify(self.request,self.manifest)["model_quality_verified"])

    def test_no_provenance_claim(self):
        record(self.request.report_path,self.revision,"completed")
        self.assertFalse(verify(self.request,self.manifest)["provenance_authenticated"])

    def test_no_release(self):
        record(self.request.report_path,self.revision,"completed")
        self.assertFalse(verify(self.request,self.manifest)["release_authorized"])

    def test_no_deployment(self):
        record(self.request.report_path,self.revision,"completed")
        self.assertFalse(verify(self.request,self.manifest)["production_deployed"])

    def test_human_review_required(self):
        record(self.request.report_path,self.revision,"completed")
        self.assertTrue(verify(self.request,self.manifest)["requires_human_review"])
