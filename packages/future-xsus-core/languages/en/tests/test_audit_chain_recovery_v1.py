import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import sqlite3
import unittest

from languages.en.learning.review_audit_v1 import SQLiteReviewAuditV1
from languages.en.learning.audit_hash_chain_v1 import SQLiteAuditHashChainV1
from languages.en.learning.audit_chain_recovery_v1 import recover_audit_chain_tail_v1


class AuditChainRecoveryV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.audit = SQLiteReviewAuditV1(root / "audit.sqlite")
        self.chain = SQLiteAuditHashChainV1(root / "chain.sqlite")
        self.cid = hashlib.sha256(b"english-recovery").hexdigest()

    def record(self, status="blocked"):
        return self.audit.record("alice", {
            "contract": "future-xsus-core.staged-review-gate.v1",
            "candidate_id": self.cid,
            "status": status,
            "reasons": ["missing"] if status == "blocked" else [],
            "review_eligible_at_check": status == "ready_for_human_review",
            "release_authorized": False,
        })

    def recover(self, **kwargs):
        return recover_audit_chain_tail_v1(self.audit, self.chain, "alice", self.cid, **kwargs)

    def test_missing_audit_rejected(self):
        with self.assertRaises(ValueError):
            self.recover()

    def test_single_event_recovered(self):
        self.record()
        self.assertEqual(self.recover()["recovered_events"], 1)

    def test_two_events_recovered(self):
        self.record()
        self.record("ready_for_human_review")
        self.assertEqual(self.recover()["recovered_events"], 2)

    def test_recovery_consistent(self):
        self.record()
        self.assertEqual(self.recover()["status"], "consistent_at_check")

    def test_idempotent(self):
        self.record()
        self.recover()
        self.assertEqual(self.recover()["recovered_events"], 0)

    def test_only_missing_tail(self):
        first = self.record()
        self.chain.append("alice", self.cid, first.sequence, first.status)
        self.record()
        self.assertEqual(self.recover()["recovered_events"], 1)

    def test_existing_head_preserved(self):
        first = self.record()
        receipt = self.chain.append("alice", self.cid, first.sequence, first.status)
        self.record()
        self.recover()
        with sqlite3.connect(self.chain.path) as db:
            first_digest = db.execute(
                "SELECT digest FROM xsus_audit_hash_chain_v1 WHERE ordinal=1"
            ).fetchone()[0]
        self.assertEqual(first_digest, receipt.digest)

    def test_mismatched_prefix_rejected(self):
        first = self.record()
        self.chain.append("alice", self.cid, first.sequence, "ready_for_human_review")
        with self.assertRaises(ValueError):
            self.recover()

    def test_corrupt_chain_rejected(self):
        first = self.record()
        self.chain.append("alice", self.cid, first.sequence, first.status)
        with sqlite3.connect(self.chain.path) as db:
            db.execute("UPDATE xsus_audit_hash_chain_v1 SET digest=?", ("a"*64,))
        with self.assertRaises(ValueError):
            self.recover()

    def test_extra_chain_event_rejected(self):
        self.record()
        self.chain.append("alice", self.cid, 9999, "blocked")
        with self.assertRaises(ValueError):
            self.recover()

    def test_limit_rejected(self):
        self.record()
        with self.assertRaises(ValueError):
            self.recover(max_events=0)

    def test_boolean_limit_rejected(self):
        self.record()
        with self.assertRaises(ValueError):
            self.recover(max_events=True)

    def test_count_limit_enforced(self):
        self.record()
        self.record()
        with self.assertRaises(ValueError):
            self.recover(max_events=1)

    def test_cross_owner_rejected_without_audit(self):
        self.record()
        with self.assertRaises(ValueError):
            recover_audit_chain_tail_v1(self.audit, self.chain, "bob", self.cid)

    def test_release_denied(self):
        self.record()
        self.assertFalse(self.recover()["release_authorized"])

    def test_nonatomic_declared(self):
        self.record()
        self.assertFalse(self.recover()["atomic_across_databases"])

    def test_reopen_persists_recovery(self):
        self.record()
        self.recover()
        reopened = SQLiteAuditHashChainV1(self.chain.path)
        self.assertEqual(reopened.verify("alice", self.cid)["event_count"], 1)

    def test_bad_audit_instance(self):
        with self.assertRaises(ValueError):
            recover_audit_chain_tail_v1(None, self.chain, "alice", self.cid)

    def test_bad_chain_instance(self):
        with self.assertRaises(ValueError):
            recover_audit_chain_tail_v1(self.audit, None, "alice", self.cid)
