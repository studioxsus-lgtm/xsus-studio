import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from languages.en.learning.candidate_quarantine_v1 import CandidateQuarantineDecisionV1
from languages.en.learning.candidate_registry_v1 import SQLiteCandidateRegistryV1
from languages.en.learning.artifact_staging_v1 import stage_candidate_artifact_v1
from languages.en.learning.staged_review_gate_v1 import assess_staged_review_v1


class StagedReviewGateV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.source = root / "candidate.bin"
        self.source.write_bytes(b"english-language-grammar-checkpoint")
        self.id = hashlib.sha256(self.source.read_bytes()).hexdigest()
        self.registry = SQLiteCandidateRegistryV1(root / "registry.db")
        self.root = root / "staged"
        self.pending = CandidateQuarantineDecisionV1("pending_human_review", (), True, False, False)
        self.quarantined = CandidateQuarantineDecisionV1("quarantined", ("revoked",), True, False, False)

    def register(self, decision=None):
        self.registry.register("alice", self.id, decision or self.pending)

    def stage(self):
        return stage_candidate_artifact_v1(self.registry, "alice", self.id, self.source, self.root)

    def check(self):
        return assess_staged_review_v1(self.registry, "alice", self.id, self.root)

    def test_valid_ready_for_review(self):
        self.register()
        self.stage()
        self.assertEqual(self.check()["status"], "ready_for_human_review")

    def test_valid_review_eligible(self):
        self.register()
        self.stage()
        self.assertTrue(self.check()["review_eligible_at_check"])

    def test_missing_artifact_blocked(self):
        self.register()
        self.assertEqual(self.check()["status"], "blocked")

    def test_missing_artifact_reason(self):
        self.register()
        self.assertIn("staged_artifact_unavailable_or_invalid", self.check()["reasons"])

    def test_tampered_artifact_blocked(self):
        self.register()
        staged = self.stage()
        Path(staged.staged_path).write_bytes(b"changed")
        self.assertEqual(self.check()["status"], "blocked")

    def test_tampered_artifact_reason(self):
        self.register()
        staged = self.stage()
        Path(staged.staged_path).write_bytes(b"changed")
        self.assertIn("staged_artifact_integrity_failed", self.check()["reasons"])

    def test_quarantined_candidate_blocked(self):
        self.register(self.quarantined)
        self.assertEqual(self.check()["status"], "blocked")

    def test_quarantine_after_stage_blocked(self):
        self.register()
        self.stage()
        self.registry.quarantine("alice", self.id, "revoked")
        self.assertEqual(self.check()["status"], "blocked")

    def test_quarantine_reason(self):
        self.register()
        self.stage()
        self.registry.quarantine("alice", self.id, "revoked")
        self.assertIn("candidate_not_pending_review", self.check()["reasons"])

    def test_never_release(self):
        self.register()
        self.stage()
        self.assertFalse(self.check()["release_authorized"])

    def test_not_continuous(self):
        self.register()
        self.stage()
        self.assertFalse(self.check()["verification_is_continuous"])

    def test_cross_owner_rejected(self):
        self.register()
        with self.assertRaises(KeyError):
            assess_staged_review_v1(self.registry, "bob", self.id, self.root)

    def test_missing_candidate_rejected(self):
        with self.assertRaises(KeyError):
            self.check()

    def test_invalid_registry_rejected(self):
        with self.assertRaises(ValueError):
            assess_staged_review_v1(None, "alice", self.id, self.root)

    def test_missing_staging_root_blocked(self):
        self.register()
        self.assertFalse(assess_staged_review_v1(self.registry, "alice", self.id, self.root / "missing")["review_eligible_at_check"])

    def test_recheck_after_reopen(self):
        self.register()
        self.stage()
        reopened = SQLiteCandidateRegistryV1(self.registry.path)
        self.assertTrue(assess_staged_review_v1(reopened, "alice", self.id, self.root)["review_eligible_at_check"])
