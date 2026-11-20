import hashlib
import sqlite3
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from languages.en.learning.audit_hash_chain_v1 import SQLiteAuditHashChainV1
from languages.en.learning.audit_head_anchor_v1 import create_audit_head_anchor_v1
from languages.en.learning.audit_anchor_archive_v1 import archive_audit_anchor_v1
from languages.en.learning.audit_anchor_prefix_v1 import (
    verify_audit_anchor_prefix_v1, verify_archived_audit_anchor_prefix_v1,
)


class AuditAnchorPrefixV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.chain = SQLiteAuditHashChainV1(root / "chain.sqlite")
        self.archive = root / "archive"
        self.owner = "alice"
        self.cid = hashlib.sha256(b"historical-prefix").hexdigest()
        self.key = b"h" * 32
        self.chain.append(self.owner, self.cid, 1, "blocked")

    def anchor(self):
        return create_audit_head_anchor_v1(self.chain, self.owner, self.cid, self.key)

    def verify(self, anchor=None, key=None):
        return verify_audit_anchor_prefix_v1(
            self.chain, self.owner, self.cid,
            self.anchor() if anchor is None else anchor,
            self.key if key is None else key,
        )

    def archive_anchor(self, version="v1"):
        anchor = self.anchor()
        archive_audit_anchor_v1(
            self.archive, version, self.owner, self.cid, anchor,
            chain=self.chain, secret_key=self.key,
        )
        return anchor

    def archived(self, version="v1"):
        return verify_archived_audit_anchor_prefix_v1(
            self.chain, self.archive, version, self.owner, self.cid, self.key
        )

    def test_current_head_verifies(self):
        self.assertEqual(self.verify()["status"], "consistent_at_check")

    def test_old_head_after_append_verifies(self):
        old = self.anchor()
        self.chain.append(self.owner, self.cid, 2, "blocked")
        self.assertTrue(self.verify(old)["historical_prefix_verified_at_check"])

    def test_old_head_after_multiple_appends_verifies(self):
        old = self.anchor()
        for i in range(2, 8):
            self.chain.append(self.owner, self.cid, i, "blocked")
        self.assertEqual(self.verify(old)["current_event_count"], 7)

    def test_archived_old_head_after_append_verifies(self):
        self.archive_anchor()
        self.chain.append(self.owner, self.cid, 2, "blocked")
        self.assertEqual(self.archived()["status"], "consistent_at_check")

    def test_multiple_archive_versions(self):
        self.archive_anchor("v1")
        self.chain.append(self.owner, self.cid, 2, "blocked")
        self.archive_anchor("v2")
        self.chain.append(self.owner, self.cid, 3, "blocked")
        self.assertEqual(self.archived("v1")["anchored_event_count"], 1)
        self.assertEqual(self.archived("v2")["anchored_event_count"], 2)

    def test_wrong_key_rejected(self):
        self.assertIn("anchor_signature_invalid", self.verify(key=b"x"*32)["reasons"])

    def test_wrong_scope_rejected(self):
        anchor = self.anchor()
        result = verify_audit_anchor_prefix_v1(
            self.chain, "bob", self.cid, anchor, self.key
        )
        self.assertIn("anchor_scope_mismatch", result["reasons"])

    def test_modified_head_rejected(self):
        anchor = self.anchor()
        anchor["head"] = "a"*64
        self.assertIn("anchor_signature_invalid", self.verify(anchor)["reasons"])

    def test_modified_count_rejected(self):
        anchor = self.anchor()
        anchor["event_count"] = 2
        self.assertIn("anchor_signature_invalid", self.verify(anchor)["reasons"])

    def test_modified_signature_rejected(self):
        anchor = self.anchor()
        anchor["signature"] = "a"*64
        self.assertIn("anchor_signature_invalid", self.verify(anchor)["reasons"])

    def test_truncation_rejected(self):
        self.chain.append(self.owner, self.cid, 2, "blocked")
        anchor = self.anchor()
        with sqlite3.connect(self.chain.path) as db:
            db.execute("DELETE FROM xsus_audit_hash_chain_v1 WHERE ordinal=2")
        self.assertIn("anchored_prefix_truncated", self.verify(anchor)["reasons"])

    def test_corrupt_first_digest_rejected(self):
        anchor = self.anchor()
        with sqlite3.connect(self.chain.path) as db:
            db.execute("UPDATE xsus_audit_hash_chain_v1 SET digest='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'")
        self.assertIn("chain_digest_invalid", self.verify(anchor)["reasons"])

    def test_corrupt_tail_rejected(self):
        anchor = self.anchor()
        self.chain.append(self.owner, self.cid, 2, "blocked")
        with sqlite3.connect(self.chain.path) as db:
            db.execute("UPDATE xsus_audit_hash_chain_v1 SET digest='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' WHERE ordinal=2")
        self.assertIn("chain_digest_invalid", self.verify(anchor)["reasons"])

    def test_invalid_anchor_schema(self):
        with self.assertRaises(ValueError):
            self.verify({})

    def test_invalid_count_boolean(self):
        anchor = self.anchor()
        anchor["event_count"] = True
        with self.assertRaises(ValueError):
            self.verify(anchor)

    def test_invalid_key(self):
        with self.assertRaises(ValueError):
            self.verify(key=b"short")

    def test_missing_archive_version(self):
        with self.assertRaises(FileNotFoundError):
            self.archived("v9")

    def test_invalid_archive_version(self):
        with self.assertRaises(ValueError):
            self.archived("../v1")

    def test_release_denied(self):
        self.assertFalse(self.verify()["release_authorized"])

    def test_no_external_storage_claim(self):
        self.assertFalse(self.verify()["externally_stored_anchor_verified"])

    def test_archive_version_returned(self):
        self.archive_anchor("v1")
        self.assertEqual(self.archived("v1")["archive_version"], "v1")

    def test_reopen_chain(self):
        anchor = self.anchor()
        reopened = SQLiteAuditHashChainV1(self.chain.path)
        self.assertEqual(
            verify_audit_anchor_prefix_v1(reopened, self.owner, self.cid, anchor, self.key)["status"],
            "consistent_at_check",
        )
