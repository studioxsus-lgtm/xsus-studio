import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from languages.en.learning.candidate_quarantine_v1 import CandidateQuarantineDecisionV1
from languages.en.learning.candidate_registry_v1 import SQLiteCandidateRegistryV1
from languages.en.learning.artifact_staging_v1 import stage_candidate_artifact_v1
from languages.en.learning.review_audit_v1 import SQLiteReviewAuditV1
from languages.en.learning.revocation_race_guard_v1 import assess_revocation_guarded_review_v1


class RevocationRaceGuardV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.source = root / "checkpoint.bin"
        self.source.write_bytes(b"english-grammar-race-test")
        self.cid = hashlib.sha256(self.source.read_bytes()).hexdigest()
        self.registry = SQLiteCandidateRegistryV1(root / "registry.db")
        self.audit = SQLiteReviewAuditV1(root / "audit.db")
        self.staging = root / "staged"
        self.pending = CandidateQuarantineDecisionV1("pending_human_review", (), True, False, False)
        self.registry.register("alice", self.cid, self.pending)
        stage_candidate_artifact_v1(self.registry, "alice", self.cid, self.source, self.staging)

    def check(self):
        return assess_revocation_guarded_review_v1(self.registry, self.audit, "alice", self.cid, self.staging)

    def test_clean_review_ready(self):
        self.assertEqual(self.check()["status"], "ready_for_human_review")

    def test_clean_review_eligible(self):
        self.assertTrue(self.check()["review_eligible_at_check"])

    def test_clean_review_audited(self):
        self.check()
        self.assertEqual(len(self.audit.history("alice", self.cid)), 1)

    def test_no_release(self):
        self.assertFalse(self.check()["release_authorized"])

    def test_not_atomic(self):
        self.assertFalse(self.check()["atomic_with_registry"])

    def test_preexisting_quarantine_blocks(self):
        self.registry.quarantine("alice", self.cid, "revoked")
        self.assertEqual(self.check()["status"], "blocked")

    def test_preexisting_quarantine_reason(self):
        self.registry.quarantine("alice", self.cid, "revoked")
        self.assertIn("candidate_not_pending_at_start", self.check()["reasons"])

    def test_tampered_artifact_blocks(self):
        self.source.write_bytes(b"source-changed")
        owner_hash = hashlib.sha256(b"alice").hexdigest()
        target = self.staging / owner_hash / self.cid[:2] / (self.cid + ".checkpoint")
        target.write_bytes(b"changed")
        self.assertFalse(self.check()["review_eligible_at_check"])

    def test_revocation_during_review_blocks(self):
        from languages.en.learning import revocation_race_guard_v1 as module
        original = module.assess_staged_review_v1
        def racing(*args):
            report = original(*args)
            self.registry.quarantine("alice", self.cid, "revoked-during-review")
            return report
        with patch.object(module, "assess_staged_review_v1", side_effect=racing):
            self.assertEqual(self.check()["status"], "blocked")

    def test_revocation_during_review_reason(self):
        from languages.en.learning import revocation_race_guard_v1 as module
        original = module.assess_staged_review_v1
        def racing(*args):
            report = original(*args)
            self.registry.quarantine("alice", self.cid, "revoked-during-review")
            return report
        with patch.object(module, "assess_staged_review_v1", side_effect=racing):
            self.assertIn("registry_revision_changed_during_review", self.check()["reasons"])

    def test_revocation_during_audit_blocks(self):
        original = self.audit.record
        def racing(owner, report):
            event = original(owner, report)
            self.registry.quarantine("alice", self.cid, "revoked-during-audit")
            return event
        with patch.object(self.audit, "record", side_effect=racing):
            self.assertEqual(self.check()["status"], "blocked")

    def test_revocation_during_audit_detected(self):
        original = self.audit.record
        def racing(owner, report):
            event = original(owner, report)
            self.registry.quarantine("alice", self.cid, "revoked-during-audit")
            return event
        with patch.object(self.audit, "record", side_effect=racing):
            self.assertFalse(self.check()["audit_reflects_final_status"])

    def test_revocation_during_audit_no_release(self):
        original = self.audit.record
        def racing(owner, report):
            event = original(owner, report)
            self.registry.quarantine("alice", self.cid, "revoked-during-audit")
            return event
        with patch.object(self.audit, "record", side_effect=racing):
            self.assertFalse(self.check()["release_authorized"])

    def test_cross_owner_denied(self):
        with self.assertRaises(KeyError):
            assess_revocation_guarded_review_v1(self.registry, self.audit, "bob", self.cid, self.staging)

    def test_bad_audit_denied(self):
        with self.assertRaises(ValueError):
            assess_revocation_guarded_review_v1(self.registry, None, "alice", self.cid, self.staging)

    def test_bad_registry_denied(self):
        with self.assertRaises(ValueError):
            assess_revocation_guarded_review_v1(None, self.audit, "alice", self.cid, self.staging)

    def test_audit_persists_blocked_review(self):
        self.registry.quarantine("alice", self.cid, "revoked")
        self.check()
        self.assertEqual(self.audit.history("alice", self.cid)[0].status, "blocked")

    def test_multiple_checks_append_audit(self):
        self.check()
        self.check()
        self.assertEqual(len(self.audit.history("alice", self.cid)), 2)
