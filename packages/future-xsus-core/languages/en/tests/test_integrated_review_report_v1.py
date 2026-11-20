import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from languages.en.learning.candidate_quarantine_v1 import CandidateQuarantineDecisionV1
from languages.en.learning.candidate_registry_v1 import SQLiteCandidateRegistryV1
from languages.en.learning.artifact_staging_v1 import stage_candidate_artifact_v1
from languages.en.learning.review_audit_v1 import SQLiteReviewAuditV1
from languages.en.learning.integrated_review_report_v1 import build_integrated_review_report_v1


class IntegratedReviewReportV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.source = root / "candidate.bin"
        self.source.write_bytes(b"english-language-integrated-report")
        self.id = hashlib.sha256(self.source.read_bytes()).hexdigest()
        self.registry = SQLiteCandidateRegistryV1(root / "registry.db")
        self.audit = SQLiteReviewAuditV1(root / "audit.db")
        self.staging = root / "staging"
        self.pending = CandidateQuarantineDecisionV1("pending_human_review", (), True, False, False)
        self.quarantined = CandidateQuarantineDecisionV1("quarantined", ("revoked",), True, False, False)

    def register(self, decision=None):
        self.registry.register("alice", self.id, decision or self.pending)

    def stage(self):
        return stage_candidate_artifact_v1(self.registry, "alice", self.id, self.source, self.staging)

    def report(self):
        return build_integrated_review_report_v1(self.registry, self.audit, "alice", self.id, self.staging)

    def test_contract(self):
        self.register()
        self.assertEqual(self.report()["contract"], "future-xsus-core.integrated-review-report.v1")

    def test_missing_artifact_blocked(self):
        self.register()
        self.assertEqual(self.report()["review_status"], "blocked")

    def test_missing_artifact_not_eligible(self):
        self.register()
        self.assertFalse(self.report()["review_eligible_at_check"])

    def test_valid_candidate_ready(self):
        self.register()
        self.stage()
        self.assertEqual(self.report()["review_status"], "ready_for_human_review")

    def test_valid_candidate_eligible(self):
        self.register()
        self.stage()
        self.assertTrue(self.report()["review_eligible_at_check"])

    def test_audit_written(self):
        self.register()
        self.report()
        self.assertEqual(len(self.audit.history("alice", self.id)), 1)

    def test_audit_sequence(self):
        self.register()
        self.assertGreater(self.report()["audit_sequence"], 0)

    def test_quarantined_candidate_blocked(self):
        self.register(self.quarantined)
        self.assertEqual(self.report()["review_status"], "blocked")

    def test_quarantined_missing_no_cleanup(self):
        self.register(self.quarantined)
        self.assertEqual(self.report()["cleanup_action"], "no_action")

    def test_quarantine_after_stage_cleanup_planned(self):
        self.register()
        self.stage()
        self.registry.quarantine("alice", self.id, "revoked")
        self.assertEqual(self.report()["cleanup_action"], "review_for_manual_cleanup")

    def test_quarantine_does_not_delete(self):
        self.register()
        staged = self.stage()
        self.registry.quarantine("alice", self.id, "revoked")
        self.report()
        self.assertTrue(Path(staged.staged_path).exists())

    def test_tampered_artifact_blocked(self):
        self.register()
        staged = self.stage()
        Path(staged.staged_path).write_bytes(b"tampered")
        self.assertFalse(self.report()["review_eligible_at_check"])

    def test_release_never_authorized(self):
        self.register()
        self.stage()
        self.assertFalse(self.report()["release_authorized"])

    def test_deletion_never_authorized(self):
        self.register()
        self.stage()
        self.assertFalse(self.report()["deletion_authorized"])

    def test_dry_run(self):
        self.register()
        self.assertTrue(self.report()["cleanup_dry_run"])

    def test_no_continuous_claim(self):
        self.register()
        self.assertFalse(self.report()["verification_is_continuous"])

    def test_cross_owner_denied(self):
        self.register()
        with self.assertRaises(KeyError):
            build_integrated_review_report_v1(self.registry, self.audit, "bob", self.id, self.staging)

    def test_cross_owner_no_audit(self):
        self.register()
        with self.assertRaises(KeyError):
            build_integrated_review_report_v1(self.registry, self.audit, "bob", self.id, self.staging)
        self.assertEqual(self.audit.history("bob", self.id), ())

    def test_persistent_audit_after_reopen(self):
        self.register()
        self.report()
        reopened = SQLiteReviewAuditV1(self.audit.path)
        self.assertEqual(len(reopened.history("alice", self.id)), 1)

    def test_multiple_checks_recorded(self):
        self.register()
        self.report()
        self.report()
        self.assertEqual(len(self.audit.history("alice", self.id)), 2)
