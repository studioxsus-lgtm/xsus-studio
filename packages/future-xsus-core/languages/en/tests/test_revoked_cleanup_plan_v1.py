import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from languages.en.learning.candidate_registry_v1 import SQLiteCandidateRegistryV1
from languages.en.learning.candidate_quarantine_v1 import CandidateQuarantineDecisionV1
from languages.en.learning.artifact_staging_v1 import stage_candidate_artifact_v1
from languages.en.learning.revoked_cleanup_plan_v1 import plan_revoked_candidate_cleanup_v1


class RevokedCleanupPlanV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.source = root / "source.bin"
        self.source.write_bytes(b"english-language-model-revocation")
        self.cid = hashlib.sha256(self.source.read_bytes()).hexdigest()
        self.registry = SQLiteCandidateRegistryV1(root / "registry.db")
        self.staging = root / "staging"
        self.pending = CandidateQuarantineDecisionV1("pending_human_review", (), True, False, False)
        self.quarantined = CandidateQuarantineDecisionV1("quarantined", ("revoked",), True, False, False)

    def plan(self):
        return plan_revoked_candidate_cleanup_v1(self.registry, "alice", self.cid, self.staging)

    def register(self, decision=None):
        self.registry.register("alice", self.cid, decision or self.pending)

    def staged_then_quarantined(self):
        self.register()
        result = stage_candidate_artifact_v1(self.registry, "alice", self.cid, self.source, self.staging)
        self.registry.quarantine("alice", self.cid, "revoked")
        return result

    def test_pending_no_action(self):
        self.register()
        self.assertEqual(self.plan().action, "no_action")

    def test_pending_no_path(self):
        self.register()
        self.assertIsNone(self.plan().artifact_path)

    def test_quarantined_missing_no_action(self):
        self.register(self.quarantined)
        self.assertEqual(self.plan().action, "no_action")

    def test_quarantined_missing_reason(self):
        self.register(self.quarantined)
        self.assertIn("staged_artifact_missing", self.plan().reasons)

    def test_quarantined_staged_planned(self):
        self.staged_then_quarantined()
        self.assertEqual(self.plan().action, "review_for_manual_cleanup")

    def test_staged_file_remains(self):
        staged = self.staged_then_quarantined()
        self.plan()
        self.assertTrue(Path(staged.staged_path).exists())

    def test_staged_bytes_unchanged(self):
        staged = self.staged_then_quarantined()
        before = Path(staged.staged_path).read_bytes()
        self.plan()
        self.assertEqual(Path(staged.staged_path).read_bytes(), before)

    def test_dry_run_true(self):
        self.staged_then_quarantined()
        self.assertTrue(self.plan().dry_run)

    def test_deletion_never_authorized(self):
        self.staged_then_quarantined()
        self.assertFalse(self.plan().deletion_authorized)

    def test_cross_owner_denied(self):
        self.register()
        with self.assertRaises(KeyError):
            plan_revoked_candidate_cleanup_v1(self.registry, "bob", self.cid, self.staging)

    def test_missing_candidate_denied(self):
        with self.assertRaises(KeyError):
            self.plan()

    def test_invalid_registry_denied(self):
        with self.assertRaises(ValueError):
            plan_revoked_candidate_cleanup_v1(None, "alice", self.cid, self.staging)

    def test_target_symlink_blocked(self):
        self.register(self.quarantined)
        owner = hashlib.sha256(b"alice").hexdigest()
        folder = self.staging / owner / self.cid[:2]
        folder.mkdir(parents=True)
        target = folder / (self.cid + ".checkpoint")
        target.symlink_to(self.source)
        self.assertEqual(self.plan().action, "blocked")

    def test_shard_symlink_blocked(self):
        self.register(self.quarantined)
        owner = hashlib.sha256(b"alice").hexdigest()
        folder = self.staging / owner
        folder.mkdir(parents=True)
        (folder / self.cid[:2]).symlink_to(Path(self.tmp.name), target_is_directory=True)
        self.assertEqual(self.plan().action, "blocked")

    def test_root_symlink_blocked(self):
        self.register(self.quarantined)
        real = Path(self.tmp.name) / "real"
        real.mkdir()
        self.staging.symlink_to(real, target_is_directory=True)
        self.assertEqual(self.plan().action, "blocked")

    def test_directory_as_target_blocked(self):
        self.register(self.quarantined)
        owner = hashlib.sha256(b"alice").hexdigest()
        folder = self.staging / owner / self.cid[:2] / (self.cid + ".checkpoint")
        folder.mkdir(parents=True)
        self.assertEqual(self.plan().action, "blocked")

    def test_no_unrelated_file_touched(self):
        staged = self.staged_then_quarantined()
        unrelated = Path(self.tmp.name) / "keep.txt"
        unrelated.write_text("important")
        self.plan()
        self.assertEqual(unrelated.read_text(), "important")
        self.assertTrue(Path(staged.staged_path).exists())

    def test_plan_contains_only_expected_target(self):
        staged = self.staged_then_quarantined()
        self.assertEqual(self.plan().artifact_path, staged.staged_path)
