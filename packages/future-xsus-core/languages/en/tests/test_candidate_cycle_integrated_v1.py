"""Integration regression: coordinator -> journal -> manifest -> review gate."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from languages.en.data.preparation.corpus import parse_example
from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.learning.autonomous_candidate_cycle_v1 import (
    CandidateCycleRequestV1, execute_autonomous_candidate_cycle_v1,
    plan_autonomous_candidate_cycle_v1,
)
from languages.en.learning.candidate_cycle_journal_v1 import inspect_candidate_cycle_journal_v1
from languages.en.learning.candidate_artifact_inspection_v1 import CandidateArtifactInspectionRequestV1
from languages.en.learning.candidate_artifact_manifest_v1 import (
    build_candidate_artifact_manifest_v1, verify_candidate_artifact_manifest_v1,
)
from languages.en.learning.candidate_completion_gate_v1 import (
    CandidateCompletionGateRequestV1, verify_candidate_completion_gate_v1,
)
from languages.en.learning.candidate_recovery_audit_v1 import (
    CandidateRecoveryAuditRequestV1, audit_candidate_recovery_v1,
)


class CandidateCycleIntegratedV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root=Path(self.tmp.name)
        self.store=SQLiteFeedbackStore(root/"feedback.sqlite")
        self.request=CandidateCycleRequestV1(
            "owner","grammar",root/"baseline.json",root/"train.jsonl",
            {"written-v4":root/"v4.jsonl","written-v5":root/"v5.jsonl"},
            root/"candidate.json",root/"report.json",
        )
        for index in range(5):
            item=self.store.submit("owner",parse_example({
                "prompt":f"Question {index}?","response":f"Response {index}."}),consent=True)
            self.store.review("owner",item.example_id,approved=True)
        self.revision=plan_autonomous_candidate_cycle_v1(self.store,self.request)["feedback_revision"]
        self.artifact_request=CandidateArtifactInspectionRequestV1(
            self.request.report_path,self.request.candidate_path,self.request.training_path)
        self.gate_request=CandidateCompletionGateRequestV1(
            self.request.report_path,self.request.candidate_path,
            self.request.training_path,self.revision)

    def _mock_training(self,**kwargs):
        self.request.candidate_path.write_bytes(b"candidate-model")
        self.request.training_path.write_bytes(b"training-corpus")
        self.request.report_path.write_bytes(b"training-report")
        return {"format":"xsus-en-learning-report-v1",
                "input_sha256":{"approved_feedback_set":self.revision},
                "eligible_for_promotion":True}

    def _execute(self):
        with patch("languages.en.learning.autonomous_candidate_cycle_v1.build_candidate",
                   side_effect=self._mock_training):
            return execute_autonomous_candidate_cycle_v1(
                self.store,self.request,approved_execution=True)

    def test_successful_cycle_completed(self):
        self._execute()
        self.assertEqual(inspect_candidate_cycle_journal_v1(self.request.report_path).state,"completed")

    def test_successful_cycle_no_deployment(self):
        self.assertFalse(self._execute()["production_deployed"])

    def test_completed_cycle_manifest_gate(self):
        self._execute()
        manifest=build_candidate_artifact_manifest_v1(self.artifact_request)
        self.assertTrue(verify_candidate_completion_gate_v1(
            self.gate_request,manifest)["ready_for_human_review"])

    def test_completed_cycle_still_requires_review(self):
        self._execute()
        manifest=build_candidate_artifact_manifest_v1(self.artifact_request)
        self.assertTrue(verify_candidate_completion_gate_v1(
            self.gate_request,manifest)["requires_human_review"])

    def test_completed_cycle_not_released(self):
        self._execute()
        manifest=build_candidate_artifact_manifest_v1(self.artifact_request)
        self.assertFalse(verify_candidate_completion_gate_v1(
            self.gate_request,manifest)["release_authorized"])

    def test_completed_cycle_not_quality_verified(self):
        self._execute()
        manifest=build_candidate_artifact_manifest_v1(self.artifact_request)
        self.assertFalse(verify_candidate_completion_gate_v1(
            self.gate_request,manifest)["model_quality_verified"])

    def test_tampered_candidate_denied(self):
        self._execute()
        manifest=build_candidate_artifact_manifest_v1(self.artifact_request)
        self.request.candidate_path.write_bytes(b"changed-model")
        self.assertFalse(verify_candidate_completion_gate_v1(
            self.gate_request,manifest)["ready_for_human_review"])

    def test_tampered_report_denied(self):
        self._execute()
        manifest=build_candidate_artifact_manifest_v1(self.artifact_request)
        self.request.report_path.write_bytes(b"changed-report")
        self.assertFalse(verify_candidate_completion_gate_v1(
            self.gate_request,manifest)["ready_for_human_review"])

    def test_missing_artifact_denied(self):
        self._execute()
        manifest=build_candidate_artifact_manifest_v1(self.artifact_request)
        self.request.candidate_path.unlink()
        self.assertFalse(verify_candidate_completion_gate_v1(
            self.gate_request,manifest)["ready_for_human_review"])

    def test_revision_mismatch_denied(self):
        self._execute()
        manifest=build_candidate_artifact_manifest_v1(self.artifact_request)
        from dataclasses import replace
        wrong=replace(self.gate_request,expected_feedback_revision="0"*64)
        self.assertFalse(verify_candidate_completion_gate_v1(
            wrong,manifest)["ready_for_human_review"])

    def test_failure_journal(self):
        with patch("languages.en.learning.autonomous_candidate_cycle_v1.build_candidate",
                   side_effect=RuntimeError("training interrupted")):
            with self.assertRaises(RuntimeError):
                execute_autonomous_candidate_cycle_v1(
                    self.store,self.request,approved_execution=True)
        self.assertEqual(inspect_candidate_cycle_journal_v1(self.request.report_path).state,"failed")

    def test_failure_audit(self):
        with patch("languages.en.learning.autonomous_candidate_cycle_v1.build_candidate",
                   side_effect=RuntimeError("training interrupted")):
            with self.assertRaises(RuntimeError):
                execute_autonomous_candidate_cycle_v1(
                    self.store,self.request,approved_execution=True)
        audit=audit_candidate_recovery_v1(CandidateRecoveryAuditRequestV1(
            self.request.report_path,self.request.candidate_path,self.request.training_path))
        self.assertTrue(audit["interrupted_or_failed_cycle"])

    def test_failure_no_report(self):
        with patch("languages.en.learning.autonomous_candidate_cycle_v1.build_candidate",
                   side_effect=RuntimeError("training interrupted")):
            with self.assertRaises(RuntimeError):
                execute_autonomous_candidate_cycle_v1(
                    self.store,self.request,approved_execution=True)
        self.assertFalse(self.request.report_path.exists())

    def test_manifest_verifies_untouched_outputs(self):
        self._execute()
        manifest=build_candidate_artifact_manifest_v1(self.artifact_request)
        self.assertTrue(verify_candidate_artifact_manifest_v1(
            self.artifact_request,manifest)["artifact_digests_match"])

    def test_audit_no_auto_resume(self):
        self._execute()
        audit=audit_candidate_recovery_v1(CandidateRecoveryAuditRequestV1(
            self.request.report_path,self.request.candidate_path,self.request.training_path))
        self.assertFalse(audit["automatic_resume_authorized"])
