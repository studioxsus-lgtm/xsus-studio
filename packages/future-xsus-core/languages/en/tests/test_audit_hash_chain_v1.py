import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import sqlite3
import unittest

from languages.en.learning.audit_hash_chain_v1 import SQLiteAuditHashChainV1


class AuditHashChainV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.chain = SQLiteAuditHashChainV1(Path(self.tmp.name) / "chain.sqlite")
        self.cid = hashlib.sha256(b"english-audit-chain").hexdigest()

    def append(self, seq=1, status="blocked"):
        return self.chain.append("alice", self.cid, seq, status)

    def verify(self, **kwargs):
        return self.chain.verify("alice", self.cid, **kwargs)

    def mutate(self, sql, args=()):
        with sqlite3.connect(self.chain.path) as db:
            db.execute(sql, args)

    def test_empty_chain_fails(self):
        self.assertEqual(self.verify()["status"], "inconsistent_or_missing")

    def test_first_event(self):
        self.assertEqual(self.append().ordinal, 1)

    def test_genesis_link(self):
        self.assertEqual(self.append().previous_digest, "0" * 64)

    def test_single_event_verifies(self):
        self.append()
        self.assertEqual(self.verify()["status"], "consistent_at_check")

    def test_multiple_events_verify(self):
        self.append()
        self.append(2, "ready_for_human_review")
        self.assertEqual(self.verify()["event_count"], 2)

    def test_head_matches_receipt(self):
        receipt = self.append()
        self.assertEqual(self.verify()["head"], receipt.digest)

    def test_expected_head_matches(self):
        receipt = self.append()
        self.assertEqual(self.verify(expected_head=receipt.digest)["status"], "consistent_at_check")

    def test_wrong_anchor_fails(self):
        self.append()
        self.assertIn("head_anchor_mismatch", self.verify(expected_head="a" * 64)["reasons"])

    def test_reopen_persists(self):
        self.append()
        reopened = SQLiteAuditHashChainV1(self.chain.path)
        self.assertEqual(reopened.verify("alice", self.cid)["event_count"], 1)

    def test_duplicate_sequence_rejected(self):
        self.append()
        with self.assertRaises(ValueError):
            self.append()

    def test_decreasing_sequence_rejected(self):
        self.append(2)
        with self.assertRaises(ValueError):
            self.append(1)

    def test_invalid_sequence_rejected(self):
        with self.assertRaises(ValueError):
            self.append(0)

    def test_invalid_status_rejected(self):
        with self.assertRaises(ValueError):
            self.append(1, "released")

    def test_modified_status_detected(self):
        self.append()
        self.mutate("UPDATE xsus_audit_hash_chain_v1 SET status='ready_for_human_review'")
        self.assertIn("event_digest_mismatch", self.verify()["reasons"])

    def test_modified_previous_link_detected(self):
        self.append()
        self.append(2)
        self.mutate("UPDATE xsus_audit_hash_chain_v1 SET previous_digest=? WHERE ordinal=2", ("a"*64,))
        self.assertIn("broken_previous_link", self.verify()["reasons"])

    def test_modified_digest_detected(self):
        self.append()
        self.mutate("UPDATE xsus_audit_hash_chain_v1 SET digest=?", ("a"*64,))
        self.assertIn("event_digest_mismatch", self.verify()["reasons"])

    def test_deleted_first_event_detected(self):
        self.append()
        self.append(2)
        self.mutate("DELETE FROM xsus_audit_hash_chain_v1 WHERE ordinal=1")
        self.assertIn("invalid_chain_order", self.verify()["reasons"])

    def test_deleted_tail_detected_with_anchor(self):
        self.append()
        last = self.append(2)
        self.mutate("DELETE FROM xsus_audit_hash_chain_v1 WHERE ordinal=2")
        self.assertIn("head_anchor_mismatch", self.verify(expected_head=last.digest)["reasons"])

    def test_owner_isolation(self):
        self.append()
        self.assertEqual(self.chain.verify("bob", self.cid)["event_count"], 0)

    def test_never_release(self):
        self.append()
        self.assertFalse(self.verify()["release_authorized"])

    def test_no_external_anchor_claim(self):
        self.append()
        self.assertFalse(self.verify()["externally_anchored"])

    def test_no_deletion_guarantee(self):
        self.append()
        self.assertFalse(self.verify()["deletion_detection_guaranteed"])
