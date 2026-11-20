import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from languages.en.learning.candidate_quarantine_v1 import CandidateQuarantineDecisionV1
from languages.en.learning.candidate_registry_v1 import SQLiteCandidateRegistryV1
from languages.en.learning.artifact_integrity_v1 import (
    digest_candidate_artifact_v1 as digest,
    verify_candidate_artifact_v1 as verify,
)


class ArtifactIntegrityV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.path = root / "candidate.bin"
        self.path.write_bytes(b"language-model-checkpoint-v1")
        self.registry = SQLiteCandidateRegistryV1(root / "registry.db")
        self.candidate_id = hashlib.sha256(self.path.read_bytes()).hexdigest()
        self.pending = CandidateQuarantineDecisionV1("pending_human_review", (), True, False, False)
        self.quarantined = CandidateQuarantineDecisionV1("quarantined", ("revoked",), True, False, False)

    def register(self, decision=None, owner="alice", candidate_id=None):
        return self.registry.register(owner, candidate_id or self.candidate_id, decision or self.pending)

    def test_digest_matches_hashlib(self):
        self.assertEqual(digest(self.path).sha256, self.candidate_id)

    def test_digest_size(self):
        self.assertEqual(digest(self.path).size_bytes, len(self.path.read_bytes()))

    def test_valid_candidate(self):
        self.register()
        self.assertTrue(verify(self.registry, "alice", self.candidate_id, self.path)["integrity_verified"])

    def test_valid_pending_review(self):
        self.register()
        self.assertTrue(verify(self.registry, "alice", self.candidate_id, self.path)["eligible_for_human_review"])

    def test_quarantined_not_eligible(self):
        self.register(self.quarantined)
        self.assertFalse(verify(self.registry, "alice", self.candidate_id, self.path)["eligible_for_human_review"])

    def test_tampered_artifact_detected(self):
        self.register()
        self.path.write_bytes(b"tampered-checkpoint")
        result = verify(self.registry, "alice", self.candidate_id, self.path)
        self.assertFalse(result["integrity_verified"])
        self.assertFalse(result["eligible_for_human_review"])

    def test_wrong_artifact_detected(self):
        self.register()
        other = Path(self.tmp.name) / "other.bin"
        other.write_bytes(b"another-model")
        self.assertFalse(verify(self.registry, "alice", self.candidate_id, other)["integrity_verified"])

    def test_cross_owner_blocked(self):
        self.register()
        with self.assertRaises(KeyError):
            verify(self.registry, "bob", self.candidate_id, self.path)

    def test_missing_candidate_blocked(self):
        with self.assertRaises(KeyError):
            verify(self.registry, "alice", "f" * 64, self.path)

    def test_empty_artifact_rejected(self):
        self.path.write_bytes(b"")
        with self.assertRaises(ValueError):
            digest(self.path)

    def test_missing_file_rejected(self):
        with self.assertRaises(FileNotFoundError):
            digest(Path(self.tmp.name) / "missing.bin")

    def test_directory_rejected(self):
        with self.assertRaises((ValueError, OSError)):
            digest(Path(self.tmp.name))

    def test_symlink_rejected(self):
        link = Path(self.tmp.name) / "link.bin"
        link.symlink_to(self.path)
        with self.assertRaises((OSError, ValueError)):
            digest(link)

    def test_release_always_denied(self):
        self.register()
        self.assertFalse(verify(self.registry, "alice", self.candidate_id, self.path)["release_authorized"])

    def test_no_lock_claim(self):
        self.register()
        self.assertFalse(verify(self.registry, "alice", self.candidate_id, self.path)["artifact_locked_against_changes"])

    def test_invalid_registry(self):
        with self.assertRaises(ValueError):
            verify(None, "alice", self.candidate_id, self.path)

    def test_same_bytes_same_digest(self):
        other = Path(self.tmp.name) / "copy.bin"
        other.write_bytes(self.path.read_bytes())
        self.assertEqual(digest(self.path), digest(other))

    def test_registry_recheck_after_quarantine(self):
        self.register()
        self.registry.quarantine("alice", self.candidate_id, "feedback_revoked")
        self.assertFalse(verify(self.registry, "alice", self.candidate_id, self.path)["eligible_for_human_review"])
