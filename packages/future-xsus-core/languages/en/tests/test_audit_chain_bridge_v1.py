import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import sqlite3
import unittest

from languages.en.learning.review_audit_v1 import SQLiteReviewAuditV1
from languages.en.learning.audit_hash_chain_v1 import SQLiteAuditHashChainV1
from languages.en.learning.audit_chain_bridge_v1 import (
    append_review_audit_receipt_v1, reconcile_review_audit_chain_v1,
)


class AuditChainBridgeV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.audit = SQLiteReviewAuditV1(root / "audit.sqlite")
        self.chain = SQLiteAuditHashChainV1(root / "chain.sqlite")
        self.cid = hashlib.sha256(b"english-bridge").hexdigest()

    def record(self, status="blocked"):
        return self.audit.record("alice", {
            "contract": "future-xsus-core.staged-review-gate.v1",
            "candidate_id": self.cid, "status": status,
            "reasons": ["unavailable"] if status == "blocked" else [],
            "review_eligible_at_check": status == "ready_for_human_review",
            "release_authorized": False,
        })

    def bridge(self, event):
        return append_review_audit_receipt_v1(self.audit, self.chain, "alice", self.cid, event.sequence)

    def reconcile(self, **kwargs):
        return reconcile_review_audit_chain_v1(self.audit, self.chain, "alice", self.cid, **kwargs)

    def test_empty_is_not_consistent(self):
        self.assertEqual(self.reconcile()["status"], "inconsistent_or_missing")

    def test_single_bridged_event_consistent(self):
        self.bridge(self.record())
        self.assertEqual(self.reconcile()["status"], "consistent_at_check")

    def test_two_bridged_events_consistent(self):
        self.bridge(self.record())
        self.bridge(self.record("ready_for_human_review"))
        self.assertEqual(self.reconcile()["audit_count_checked"], 2)

    def test_bridge_head_is_digest(self):
        result = self.bridge(self.record())
        self.assertEqual(len(result["chain_head"]), 64)

    def test_bridge_sequence_matches(self):
        event = self.record()
        self.assertEqual(self.bridge(event)["audit_sequence"], event.sequence)

    def test_bridge_never_releases(self):
        self.assertFalse(self.bridge(self.record())["release_authorized"])

    def test_reconcile_never_releases(self):
        self.assertFalse(self.reconcile()["release_authorized"])

    def test_not_atomic(self):
        self.assertFalse(self.bridge(self.record())["atomic_across_databases"])

    def test_missing_audit_rejected(self):
        with self.assertRaises(ValueError):
            append_review_audit_receipt_v1(self.audit, self.chain, "alice", self.cid, 1)

    def test_stale_audit_rejected(self):
        old = self.record()
        self.record()
        with self.assertRaises(ValueError):
            self.bridge(old)

    def test_duplicate_receipt_rejected(self):
        event = self.record()
        self.bridge(event)
        with self.assertRaises(ValueError):
            self.bridge(event)

    def test_unbridged_audit_detected(self):
        self.bridge(self.record())
        self.record()
        self.assertIn("audit_chain_count_mismatch", self.reconcile()["reasons"])

    def test_tampered_audit_status_detected(self):
        event = self.record()
        self.bridge(event)
        with sqlite3.connect(self.audit.path) as db:
            db.execute("UPDATE xsus_review_audit_v1 SET status='ready_for_human_review' WHERE sequence=?", (event.sequence,))
        self.assertIn("audit_chain_event_mismatch", self.reconcile()["reasons"])

    def test_tampered_chain_detected(self):
        self.bridge(self.record())
        with sqlite3.connect(self.chain.path) as db:
            db.execute("UPDATE xsus_audit_hash_chain_v1 SET digest=?", ("a"*64,))
        self.assertEqual(self.reconcile()["status"], "inconsistent_or_missing")

    def test_wrong_head_detected(self):
        self.bridge(self.record())
        self.assertIn("head_anchor_mismatch", self.reconcile(expected_head="a"*64)["reasons"])

    def test_cross_owner_not_visible(self):
        self.bridge(self.record())
        result = reconcile_review_audit_chain_v1(self.audit, self.chain, "bob", self.cid)
        self.assertEqual(result["audit_count_checked"], 0)

    def test_bad_audit_instance(self):
        with self.assertRaises(ValueError):
            reconcile_review_audit_chain_v1(None, self.chain, "alice", self.cid)

    def test_bad_chain_instance(self):
        with self.assertRaises(ValueError):
            reconcile_review_audit_chain_v1(self.audit, None, "alice", self.cid)
