import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from languages.en.learning.candidate_quarantine_v1 import CandidateQuarantineDecisionV1
from languages.en.learning.candidate_registry_v1 import SQLiteCandidateRegistryV1
from languages.en.learning.artifact_staging_v1 import stage_candidate_artifact_v1
from languages.en.learning.review_audit_v1 import SQLiteReviewAuditV1, assess_and_audit_staged_review_v1


class ReviewAuditV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.source = root / "candidate.bin"
        self.source.write_bytes(b"english-language-audit-test")
        self.id = hashlib.sha256(self.source.read_bytes()).hexdigest()
        self.registry = SQLiteCandidateRegistryV1(root / "registry.db")
        self.audit = SQLiteReviewAuditV1(root / "audit.db")
        self.staging = root / "staged"
        self.pending = CandidateQuarantineDecisionV1("pending_human_review", (), True, False, False)
        self.registry.register("alice", self.id, self.pending)

    def assess(self):
        return assess_and_audit_staged_review_v1(self.registry, self.audit, "alice", self.id, self.staging)

    def test_missing_artifact_logged_as_blocked(self):
        self.assertEqual(self.assess()["review"]["status"], "blocked")

    def test_missing_artifact_recorded(self):
        self.assess()
        self.assertEqual(self.audit.history("alice", self.id)[0].status, "blocked")

    def test_valid_artifact_logged(self):
        stage_candidate_artifact_v1(self.registry, "alice", self.id, self.source, self.staging)
        self.assertEqual(self.assess()["review"]["status"], "ready_for_human_review")

    def test_valid_audit_status(self):
        stage_candidate_artifact_v1(self.registry, "alice", self.id, self.source, self.staging)
        self.assess()
        self.assertEqual(self.audit.history("alice", self.id)[0].status, "ready_for_human_review")

    def test_multiple_events(self):
        self.assess()
        self.assess()
        self.assertEqual(len(self.audit.history("alice", self.id)), 2)

    def test_sequence_increases(self):
        first = self.assess()
        second = self.assess()
        self.assertLess(first["audit_sequence"], second["audit_sequence"])

    def test_persistent_audit(self):
        self.assess()
        reopened = SQLiteReviewAuditV1(self.audit.path)
        self.assertEqual(len(reopened.history("alice", self.id)), 1)

    def test_owner_scoping(self):
        self.assess()
        self.assertEqual(self.audit.history("bob", self.id), ())

    def test_quarantine_logged(self):
        stage_candidate_artifact_v1(self.registry, "alice", self.id, self.source, self.staging)
        self.registry.quarantine("alice", self.id, "revoked")
        self.assertEqual(self.assess()["review"]["status"], "blocked")

    def test_tampering_logged(self):
        result = stage_candidate_artifact_v1(self.registry, "alice", self.id, self.source, self.staging)
        Path(result.staged_path).write_bytes(b"tampered")
        self.assertEqual(self.assess()["review"]["status"], "blocked")

    def test_no_release(self):
        self.assertFalse(self.assess()["release_authorized"])

    def test_audit_event_no_release(self):
        self.assess()
        self.assertFalse(self.audit.history("alice", self.id)[0].release_authorized)

    def test_bad_report_rejected(self):
        with self.assertRaises(ValueError):
            self.audit.record("alice", {})

    def test_fake_success_rejected(self):
        with self.assertRaises(ValueError):
            self.audit.record("alice", {"contract":"future-xsus-core.staged-review-gate.v1",
                "candidate_id":self.id,"status":"ready_for_human_review",
                "reasons":["bad"],"review_eligible_at_check":True,"release_authorized":False})

    def test_fake_release_rejected(self):
        with self.assertRaises(ValueError):
            self.audit.record("alice", {"contract":"future-xsus-core.staged-review-gate.v1",
                "candidate_id":self.id,"status":"blocked","reasons":["bad"],
                "review_eligible_at_check":False,"release_authorized":True})

    def test_history_limit(self):
        self.assess()
        self.assess()
        self.assertEqual(len(self.audit.history("alice", self.id, limit=1)), 1)

    def test_bad_history_limit(self):
        with self.assertRaises(ValueError):
            self.audit.history("alice", self.id, limit=0)

    def test_bad_audit_instance(self):
        with self.assertRaises(ValueError):
            assess_and_audit_staged_review_v1(self.registry, None, "alice", self.id, self.staging)
