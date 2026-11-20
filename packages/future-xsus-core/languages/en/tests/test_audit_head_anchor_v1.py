import hashlib
import sqlite3
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from languages.en.learning.audit_hash_chain_v1 import SQLiteAuditHashChainV1
from languages.en.learning.audit_head_anchor_v1 import (
    create_audit_head_anchor_v1, verify_audit_head_anchor_v1,
)


class AuditHeadAnchorV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.chain = SQLiteAuditHashChainV1(Path(self.tmp.name) / "chain.sqlite")
        self.owner = "alice"
        self.cid = hashlib.sha256(b"anchor-candidate").hexdigest()
        self.key = b"k" * 32

    def append(self, status="blocked"):
        count = self.chain.verify(self.owner, self.cid)["event_count"]
        return self.chain.append(self.owner, self.cid, count + 1, status)

    def create(self):
        return create_audit_head_anchor_v1(self.chain, self.owner, self.cid, self.key)

    def verify(self, anchor, key=None):
        return verify_audit_head_anchor_v1(self.chain, self.owner, self.cid,
                                           anchor, self.key if key is None else key)

    def test_empty_chain_rejected(self):
        with self.assertRaises(ValueError):
            self.create()

    def test_one_receipt(self):
        self.append()
        self.assertEqual(self.verify(self.create())["status"], "consistent_at_check")

    def test_multiple_receipts(self):
        self.append()
        self.append("ready_for_human_review")
        self.assertEqual(self.verify(self.create())["event_count"], 2)

    def test_signature_is_hex(self):
        self.append()
        self.assertEqual(len(self.create()["signature"]), 64)

    def test_wrong_key(self):
        self.append()
        self.assertIn("anchor_signature_invalid", self.verify(self.create(), b"x"*32)["reasons"])

    def test_short_key_rejected(self):
        self.append()
        with self.assertRaises(ValueError):
            create_audit_head_anchor_v1(self.chain, self.owner, self.cid, b"short")

    def test_nonbytes_key_rejected(self):
        self.append()
        with self.assertRaises(ValueError):
            self.verify(self.create(), "not-bytes")

    def test_modified_signature(self):
        self.append()
        anchor = self.create()
        anchor["signature"] = "a"*64
        self.assertIn("anchor_signature_invalid", self.verify(anchor)["reasons"])

    def test_modified_head(self):
        self.append()
        anchor = self.create()
        anchor["head"] = "a"*64
        self.assertIn("anchor_signature_invalid", self.verify(anchor)["reasons"])

    def test_modified_count(self):
        self.append()
        anchor = self.create()
        anchor["event_count"] = 2
        self.assertIn("anchor_signature_invalid", self.verify(anchor)["reasons"])

    def test_truncated_chain(self):
        self.append()
        self.append()
        anchor = self.create()
        with sqlite3.connect(self.chain.path) as db:
            db.execute("DELETE FROM xsus_audit_hash_chain_v1 WHERE ordinal=2")
        self.assertIn("anchor_count_mismatch", self.verify(anchor)["reasons"])

    def test_appended_chain_requires_new_anchor(self):
        self.append()
        anchor = self.create()
        self.append()
        self.assertIn("anchor_head_mismatch", self.verify(anchor)["reasons"])

    def test_reanchoring_after_append(self):
        self.append()
        self.create()
        self.append()
        self.assertEqual(self.verify(self.create())["status"], "consistent_at_check")

    def test_corrupt_digest(self):
        self.append()
        anchor = self.create()
        with sqlite3.connect(self.chain.path) as db:
            db.execute("UPDATE xsus_audit_hash_chain_v1 SET digest=?", ("a"*64,))
        self.assertIn("chain_integrity_invalid", self.verify(anchor)["reasons"])

    def test_cross_owner_rejected(self):
        self.append()
        anchor = self.create()
        result = verify_audit_head_anchor_v1(self.chain, "bob", self.cid, anchor, self.key)
        self.assertIn("anchor_scope_mismatch", result["reasons"])

    def test_cross_candidate_rejected(self):
        self.append()
        anchor = self.create()
        other = hashlib.sha256(b"other").hexdigest()
        result = verify_audit_head_anchor_v1(self.chain, self.owner, other, anchor, self.key)
        self.assertIn("anchor_scope_mismatch", result["reasons"])

    def test_invalid_schema(self):
        self.append()
        anchor = self.create()
        anchor["unexpected"] = True
        with self.assertRaises(ValueError):
            self.verify(anchor)

    def test_invalid_head_format(self):
        self.append()
        anchor = self.create()
        anchor["head"] = "bad"
        with self.assertRaises(ValueError):
            self.verify(anchor)

    def test_invalid_signature_format(self):
        self.append()
        anchor = self.create()
        anchor["signature"] = "bad"
        with self.assertRaises(ValueError):
            self.verify(anchor)

    def test_invalid_count_bool(self):
        self.append()
        anchor = self.create()
        anchor["event_count"] = True
        with self.assertRaises(ValueError):
            self.verify(anchor)

    def test_release_always_denied(self):
        self.append()
        self.assertFalse(self.verify(self.create())["release_authorized"])

    def test_external_storage_not_claimed(self):
        self.append()
        self.assertFalse(self.verify(self.create())["anchor_stored_externally"])

    def test_reopen_and_verify(self):
        self.append()
        anchor = self.create()
        reopened = SQLiteAuditHashChainV1(self.chain.path)
        result = verify_audit_head_anchor_v1(reopened, self.owner, self.cid, anchor, self.key)
        self.assertEqual(result["status"], "consistent_at_check")

    def test_deterministic_anchor(self):
        self.append()
        self.assertEqual(self.create(), self.create())
