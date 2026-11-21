import tempfile
import unittest
from dataclasses import replace
from pathlib import Path
from languages.en.learning.candidate_recovery_audit_v1 import (
    CandidateRecoveryAuditRequestV1 as Request, audit_candidate_recovery_v1 as audit,
)
from languages.en.learning.candidate_cycle_journal_v1 import record_candidate_cycle_state_v1 as record


class CandidateRecoveryAuditV1Tests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root=Path(self.temp.name)
        self.request=Request(root/"report.json",root/"candidate.json",root/"train.jsonl")
        self.revision="a"*64

    def test_absent(self):
        self.assertEqual(audit(self.request)["journal_state"],"absent")

    def test_missing_artifacts(self):
        self.assertEqual(len(audit(self.request)["missing_artifacts"]),3)

    def test_running(self):
        record(self.request.report_path,self.revision,"running")
        self.assertTrue(audit(self.request)["interrupted_or_failed_cycle"])

    def test_failed(self):
        record(self.request.report_path,self.revision,"failed")
        self.assertTrue(audit(self.request)["interrupted_or_failed_cycle"])

    def test_interrupted(self):
        record(self.request.report_path,self.revision,"interrupted")
        self.assertTrue(audit(self.request)["interrupted_or_failed_cycle"])

    def test_completed(self):
        record(self.request.report_path,self.revision,"completed")
        self.assertFalse(audit(self.request)["interrupted_or_failed_cycle"])

    def test_all_present(self):
        for path in (self.request.report_path,self.request.candidate_path,self.request.training_path):
            path.write_bytes(b"test")
        self.assertTrue(audit(self.request)["all_artifacts_present"])

    def test_completed_not_verified(self):
        record(self.request.report_path,self.revision,"completed")
        self.assertFalse(audit(self.request)["training_success_independently_verified"])

    def test_symlink_unsafe(self):
        self.request.training_path.write_bytes(b"test")
        self.request.candidate_path.symlink_to(self.request.training_path)
        self.assertIn("candidate",audit(self.request)["unsafe_artifacts"])

    def test_oversized(self):
        self.request.report_path.write_bytes(b"12345")
        result=audit(replace(self.request,max_bytes_per_artifact=4))
        self.assertIn("report",result["unsafe_artifacts"])

    def test_sha256_present(self):
        self.request.report_path.write_bytes(b"abc")
        self.assertEqual(len(audit(self.request)["artifacts"]["report"]["sha256"]),64)

    def test_read_only(self):
        audit(self.request)
        self.assertFalse(self.request.report_path.exists())

    def test_no_resume(self):
        self.assertFalse(audit(self.request)["automatic_resume_authorized"])

    def test_no_release(self):
        self.assertFalse(audit(self.request)["candidate_release_authorized"])

    def test_no_cleanup(self):
        self.assertFalse(audit(self.request)["artifact_cleanup_performed"])

    def test_manual_review(self):
        self.assertTrue(audit(self.request)["requires_manual_review"])

    def test_invalid_request(self):
        with self.assertRaises(ValueError):
            audit(None)

    def test_invalid_path(self):
        with self.assertRaises(ValueError):
            audit(replace(self.request,report_path="report.json"))

    def test_duplicate_paths(self):
        with self.assertRaises(ValueError):
            audit(replace(self.request,candidate_path=self.request.report_path))

    def test_invalid_size(self):
        with self.assertRaises(ValueError):
            audit(replace(self.request,max_bytes_per_artifact=0))
