import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from languages.en.learning.candidate_registry_v1 import SQLiteCandidateRegistryV1
from languages.en.learning.candidate_quarantine_v1 import CandidateQuarantineDecisionV1
from languages.en.learning.artifact_staging_v1 import (
    stage_candidate_artifact_v1 as stage,
    verify_staged_candidate_v1 as verify,
)


class ArtifactStagingV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.source = root / "checkpoint.bin"
        self.source.write_bytes(b"english-language-candidate")
        self.candidate_id = hashlib.sha256(self.source.read_bytes()).hexdigest()
        self.registry = SQLiteCandidateRegistryV1(root / "registry.sqlite")
        self.staging = root / "staging"
        self.pending = CandidateQuarantineDecisionV1("pending_human_review", (), True, False, False)
        self.quarantined = CandidateQuarantineDecisionV1("quarantined", ("revoked",), True, False, False)

    def register(self, owner="alice", decision=None):
        self.registry.register(owner, self.candidate_id, decision or self.pending)

    def test_stage_valid(self):
        self.register()
        result = stage(self.registry, "alice", self.candidate_id, self.source, self.staging)
        self.assertEqual(result.sha256, self.candidate_id)

    def test_staged_bytes_match(self):
        self.register()
        result = stage(self.registry, "alice", self.candidate_id, self.source, self.staging)
        self.assertEqual(Path(result.staged_path).read_bytes(), self.source.read_bytes())

    def test_staged_size(self):
        self.register()
        result = stage(self.registry, "alice", self.candidate_id, self.source, self.staging)
        self.assertEqual(result.size_bytes, len(self.source.read_bytes()))

    def test_stage_idempotent(self):
        self.register()
        first = stage(self.registry, "alice", self.candidate_id, self.source, self.staging)
        second = stage(self.registry, "alice", self.candidate_id, self.source, self.staging)
        self.assertEqual(first.staged_path, second.staged_path)

    def test_verify_staged(self):
        self.register()
        stage(self.registry, "alice", self.candidate_id, self.source, self.staging)
        self.assertTrue(verify(self.registry, "alice", self.candidate_id, self.staging)["integrity_verified"])

    def test_verify_review_eligible(self):
        self.register()
        stage(self.registry, "alice", self.candidate_id, self.source, self.staging)
        self.assertTrue(verify(self.registry, "alice", self.candidate_id, self.staging)["eligible_for_human_review"])

    def test_quarantined_rejected(self):
        self.register(decision=self.quarantined)
        with self.assertRaises(ValueError):
            stage(self.registry, "alice", self.candidate_id, self.source, self.staging)

    def test_cross_owner_rejected(self):
        self.register()
        with self.assertRaises(KeyError):
            stage(self.registry, "bob", self.candidate_id, self.source, self.staging)

    def test_tampered_source_rejected(self):
        self.register()
        self.source.write_bytes(b"tampered")
        with self.assertRaises(ValueError):
            stage(self.registry, "alice", self.candidate_id, self.source, self.staging)

    def test_missing_source_rejected(self):
        self.register()
        with self.assertRaises(FileNotFoundError):
            stage(self.registry, "alice", self.candidate_id, Path(self.tmp.name) / "missing", self.staging)

    def test_symlink_source_rejected(self):
        self.register()
        link = Path(self.tmp.name) / "link.bin"
        link.symlink_to(self.source)
        with self.assertRaises((ValueError, OSError)):
            stage(self.registry, "alice", self.candidate_id, link, self.staging)

    def test_no_release(self):
        self.register()
        self.assertFalse(stage(self.registry, "alice", self.candidate_id, self.source, self.staging).release_authorized)

    def test_no_continuous_integrity_claim(self):
        self.register()
        stage(self.registry, "alice", self.candidate_id, self.source, self.staging)
        self.assertFalse(verify(self.registry, "alice", self.candidate_id, self.staging)["continuous_integrity_guaranteed"])

    def test_revocation_after_stage_blocks_review(self):
        self.register()
        stage(self.registry, "alice", self.candidate_id, self.source, self.staging)
        self.registry.quarantine("alice", self.candidate_id, "revoked")
        self.assertFalse(verify(self.registry, "alice", self.candidate_id, self.staging)["eligible_for_human_review"])

    def test_staged_tampering_detected(self):
        self.register()
        result = stage(self.registry, "alice", self.candidate_id, self.source, self.staging)
        Path(result.staged_path).write_bytes(b"tampered")
        self.assertFalse(verify(self.registry, "alice", self.candidate_id, self.staging)["integrity_verified"])

    def test_wrong_registry(self):
        self.register()
        with self.assertRaises(ValueError):
            stage(None, "alice", self.candidate_id, self.source, self.staging)
