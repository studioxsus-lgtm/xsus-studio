import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from languages.en.learning.audit_hash_chain_v1 import SQLiteAuditHashChainV1
from languages.en.learning.audit_head_anchor_v1 import create_audit_head_anchor_v1
from languages.en.learning.audit_anchor_archive_v1 import archive_audit_anchor_v1
from languages.en.learning.audit_anchor_continuity_v1 import inspect_audit_anchor_continuity_v1


class AuditAnchorContinuityV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.root = root / "archive"
        self.chain = SQLiteAuditHashChainV1(root / "chain.sqlite")
        self.owner = "alice"
        self.cid = hashlib.sha256(b"archive-continuity").hexdigest()
        self.key = b"c" * 32
        self.chain.append(self.owner, self.cid, 1, "blocked")

    def save(self, version):
        anchor = create_audit_head_anchor_v1(self.chain, self.owner, self.cid, self.key)
        return archive_audit_anchor_v1(
            self.root, version, self.owner, self.cid, anchor,
            chain=self.chain, secret_key=self.key,
        )

    def inspect(self, **kwargs):
        return inspect_audit_anchor_continuity_v1(
            self.chain, self.root, self.owner, self.cid, self.key, **kwargs
        )

    def test_empty_archive(self):
        self.assertIn("no_checkpoints", self.inspect()["reasons"])

    def test_single_version(self):
        self.save("v1")
        self.assertEqual(self.inspect()["status"], "consistent_at_check")

    def test_three_versions(self):
        self.save("v1")
        self.chain.append(self.owner, self.cid, 2, "blocked")
        self.save("v2")
        self.chain.append(self.owner, self.cid, 3, "blocked")
        self.save("v3")
        self.assertEqual(self.inspect()["status"], "consistent_at_check")

    def test_versions_ordered(self):
        self.save("v1")
        self.chain.append(self.owner, self.cid, 2, "blocked")
        self.save("v2")
        self.assertEqual(self.inspect()["versions"], ("v1", "v2"))

    def test_gap_detected(self):
        self.save("v1")
        self.chain.append(self.owner, self.cid, 2, "blocked")
        self.save("v3")
        self.assertIn("version_gap_or_noncanonical_sequence", self.inspect()["reasons"])

    def test_first_version_missing_detected(self):
        self.save("v2")
        self.assertIn("version_gap_or_noncanonical_sequence", self.inspect()["reasons"])

    def test_gap_optional(self):
        self.save("v2")
        self.assertEqual(self.inspect(require_consecutive_versions=False)["status"], "consistent_at_check")

    def test_repeated_head_detected(self):
        self.save("v1")
        self.save("v2")
        self.assertIn("repeated_checkpoint_head:v2", self.inspect()["reasons"])

    def test_nonincreasing_count_detected(self):
        self.save("v1")
        self.save("v2")
        self.assertIn("non_increasing_checkpoint_count:v2", self.inspect()["reasons"])

    def test_tampered_signature_detected(self):
        path = self.save("v1")
        data = json.loads(path.read_text())
        data["signature"] = "a"*64
        path.write_text(json.dumps(data))
        self.assertIn("checkpoint_verification_failed:v1", self.inspect()["reasons"])

    def test_chain_extension_keeps_history_valid(self):
        self.save("v1")
        self.chain.append(self.owner, self.cid, 2, "blocked")
        self.assertEqual(self.inspect()["status"], "consistent_at_check")

    def test_max_versions_limit(self):
        self.save("v1")
        self.chain.append(self.owner, self.cid, 2, "blocked")
        self.save("v2")
        self.assertIn("version_limit_exceeded", self.inspect(max_versions=1)["reasons"])

    def test_boolean_limit_rejected(self):
        with self.assertRaises(ValueError):
            self.inspect(max_versions=True)

    def test_invalid_consecutive_flag(self):
        with self.assertRaises(ValueError):
            self.inspect(require_consecutive_versions="yes")

    def test_invalid_key(self):
        with self.assertRaises(ValueError):
            inspect_audit_anchor_continuity_v1(
                self.chain, self.root, self.owner, self.cid, b"short"
            )

    def test_scope_isolation(self):
        self.save("v1")
        result = inspect_audit_anchor_continuity_v1(
            self.chain, self.root, "bob", self.cid, self.key
        )
        self.assertIn("no_checkpoints", result["reasons"])

    def test_release_denied(self):
        self.save("v1")
        self.assertFalse(self.inspect()["release_authorized"])

    def test_no_completeness_claim(self):
        self.save("v1")
        self.assertFalse(self.inspect()["archive_completeness_proven"])

    def test_no_independent_trust_claim(self):
        self.save("v1")
        self.assertFalse(self.inspect()["independent_trust_boundary"])

    def test_check_details(self):
        self.save("v1")
        self.assertEqual(self.inspect()["checks"][0]["anchored_event_count"], 1)

    def test_reopen(self):
        self.save("v1")
        reopened = SQLiteAuditHashChainV1(self.chain.path)
        self.assertEqual(
            inspect_audit_anchor_continuity_v1(
                reopened, self.root, self.owner, self.cid, self.key
            )["status"], "consistent_at_check"
        )
