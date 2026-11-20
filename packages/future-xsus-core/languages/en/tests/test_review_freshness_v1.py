import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from languages.en.learning.candidate_quarantine_v1 import CandidateQuarantineDecisionV1
from languages.en.learning.candidate_registry_v1 import SQLiteCandidateRegistryV1
from languages.en.learning.artifact_staging_v1 import stage_candidate_artifact_v1
from languages.en.learning.review_audit_v1 import SQLiteReviewAuditV1, assess_and_audit_staged_review_v1
from languages.en.learning.review_freshness_v1 import check_review_freshness_v1


class ReviewFreshnessV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.source = root / "candidate.bin"
        self.source.write_bytes(b"english-grammar-freshness")
        self.cid = hashlib.sha256(self.source.read_bytes()).hexdigest()
        self.registry = SQLiteCandidateRegistryV1(root / "registry.db")
        self.audit = SQLiteReviewAuditV1(root / "audit.db")
        self.staging = root / "staged"
        pending = CandidateQuarantineDecisionV1("pending_human_review", (), True, False, False)
        self.registry.register("alice", self.cid, pending)

    def record(self):
        return assess_and_audit_staged_review_v1(
            self.registry, self.audit, "alice", self.cid, self.staging
        )["audit_sequence"]

    def check(self, seq):
        return check_review_freshness_v1(
            self.registry, self.audit, "alice", self.cid, self.staging, seq
        )

    def stage(self):
        return stage_candidate_artifact_v1(
            self.registry, "alice", self.cid, self.source, self.staging
        )

    def test_fresh_candidate(self):
        self.stage()
        self.assertEqual(self.check(self.record())["status"], "fresh_at_check")

    def test_fresh_candidate_eligible(self):
        self.stage()
        self.assertTrue(self.check(self.record())["review_eligible_at_check"])

    def test_never_authorizes_release(self):
        self.stage()
        self.assertFalse(self.check(self.record())["release_authorized"])

    def test_not_atomic(self):
        self.stage()
        self.assertFalse(self.check(self.record())["atomic_with_registry_or_audit"])

    def test_no_audit_is_stale(self):
        self.stage()
        self.assertEqual(self.check(1)["status"], "stale_or_blocked")

    def test_blocked_audit_is_stale(self):
        self.assertEqual(self.check(self.record())["status"], "stale_or_blocked")

    def test_prior_sequence_is_stale(self):
        self.stage()
        old = self.record()
        self.record()
        self.assertIn("audit_sequence_not_latest", self.check(old)["reasons"])

    def test_latest_sequence_fresh(self):
        self.stage()
        self.record()
        latest = self.record()
        self.assertEqual(self.check(latest)["status"], "fresh_at_check")

    def test_revocation_is_stale(self):
        self.stage()
        seq = self.record()
        self.registry.quarantine("alice", self.cid, "revoked")
        self.assertEqual(self.check(seq)["status"], "stale_or_blocked")

    def test_revocation_reason(self):
        self.stage()
        seq = self.record()
        self.registry.quarantine("alice", self.cid, "revoked")
        self.assertIn("candidate_not_pending_review", self.check(seq)["reasons"])

    def test_tampering_is_stale(self):
        staged = self.stage()
        seq = self.record()
        Path(staged.staged_path).write_bytes(b"tampered")
        self.assertEqual(self.check(seq)["status"], "stale_or_blocked")

    def test_tampering_reason(self):
        staged = self.stage()
        seq = self.record()
        Path(staged.staged_path).write_bytes(b"tampered")
        self.assertIn("current_artifact_or_status_not_eligible", self.check(seq)["reasons"])

    def test_missing_staged_file_is_stale(self):
        staged = self.stage()
        seq = self.record()
        Path(staged.staged_path).unlink()
        self.assertEqual(self.check(seq)["status"], "stale_or_blocked")

    def test_bad_sequence_zero(self):
        with self.assertRaises(ValueError):
            self.check(0)

    def test_bad_sequence_bool(self):
        with self.assertRaises(ValueError):
            self.check(True)

    def test_cross_owner_denied(self):
        self.stage()
        seq = self.record()
        with self.assertRaises(KeyError):
            check_review_freshness_v1(self.registry, self.audit, "bob", self.cid, self.staging, seq)

    def test_invalid_audit_denied(self):
        with self.assertRaises(ValueError):
            check_review_freshness_v1(self.registry, None, "alice", self.cid, self.staging, 1)

    def test_invalid_registry_denied(self):
        with self.assertRaises(ValueError):
            check_review_freshness_v1(None, self.audit, "alice", self.cid, self.staging, 1)
