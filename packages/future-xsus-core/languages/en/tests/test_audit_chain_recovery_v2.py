import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
from concurrent.futures import ThreadPoolExecutor
import sqlite3
import unittest

from languages.en.learning.review_audit_v1 import SQLiteReviewAuditV1
from languages.en.learning.audit_hash_chain_v1 import SQLiteAuditHashChainV1
from languages.en.learning.audit_chain_recovery_v2 import recover_audit_chain_tail_v2


class AuditChainRecoveryV2Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.audit = SQLiteReviewAuditV1(root / "audit.sqlite")
        self.chain = SQLiteAuditHashChainV1(root / "chain.sqlite")
        self.cid = hashlib.sha256(b"english-recovery-v2").hexdigest()

    def record(self, status="blocked"):
        return self.audit.record("alice", {
            "contract": "future-xsus-core.staged-review-gate.v1",
            "candidate_id": self.cid, "status": status,
            "reasons": ["missing"] if status == "blocked" else [],
            "review_eligible_at_check": status == "ready_for_human_review",
            "release_authorized": False,
        })

    def recover(self, **kwargs):
        return recover_audit_chain_tail_v2(self.audit, self.chain, "alice", self.cid, **kwargs)

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            self.recover()

    def test_single_event(self):
        self.record()
        self.assertEqual(self.recover()["recovered_events"], 1)

    def test_multiple_events(self):
        self.record()
        self.record("ready_for_human_review")
        self.assertEqual(self.recover()["recovered_events"], 2)

    def test_consistent(self):
        self.record()
        self.assertEqual(self.recover()["status"], "consistent_at_check")

    def test_idempotent(self):
        self.record()
        self.recover()
        self.assertEqual(self.recover()["recovered_events"], 0)

    def test_resume_prefix(self):
        first = self.record()
        self.chain.append("alice", self.cid, first.sequence, first.status)
        self.record()
        self.assertEqual(self.recover()["recovered_events"], 1)

    def test_concurrent_recovery_exactly_once(self):
        for _ in range(12):
            self.record()
        with ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda _: self.recover(), range(4)))
        self.assertEqual(sum(r["recovered_events"] for r in results), 12)
        self.assertEqual(self.chain.verify("alice", self.cid)["event_count"], 12)

    def test_concurrent_recovery_all_consistent(self):
        for _ in range(8):
            self.record()
        with ThreadPoolExecutor(max_workers=3) as pool:
            results = list(pool.map(lambda _: self.recover(), range(3)))
        self.assertTrue(all(r["status"] == "consistent_at_check" for r in results))

    def test_corrupt_prefix_rejected(self):
        first = self.record()
        self.chain.append("alice", self.cid, first.sequence, first.status)
        with sqlite3.connect(self.chain.path) as db:
            db.execute("UPDATE xsus_audit_hash_chain_v1 SET digest=?", ("a"*64,))
        with self.assertRaises(ValueError):
            self.recover()

    def test_mismatched_status_rejected(self):
        first = self.record()
        self.chain.append("alice", self.cid, first.sequence, "ready_for_human_review")
        with self.assertRaises(ValueError):
            self.recover()

    def test_no_partial_write_on_invalid_prefix(self):
        first = self.record()
        self.chain.append("alice", self.cid, first.sequence, "ready_for_human_review")
        self.record()
        with self.assertRaises(ValueError):
            self.recover()
        self.assertEqual(self.chain.verify("alice", self.cid)["event_count"], 1)

    def test_count_limit(self):
        self.record()
        self.record()
        with self.assertRaises(ValueError):
            self.recover(max_events=1)

    def test_bool_limit_rejected(self):
        self.record()
        with self.assertRaises(ValueError):
            self.recover(max_events=True)

    def test_bad_audit_instance(self):
        with self.assertRaises(ValueError):
            recover_audit_chain_tail_v2(None, self.chain, "alice", self.cid)

    def test_bad_chain_instance(self):
        with self.assertRaises(ValueError):
            recover_audit_chain_tail_v2(self.audit, None, "alice", self.cid)

    def test_owner_isolation(self):
        self.record()
        with self.assertRaises(ValueError):
            recover_audit_chain_tail_v2(self.audit, self.chain, "bob", self.cid)

    def test_release_denied(self):
        self.record()
        self.assertFalse(self.recover()["release_authorized"])

    def test_not_cross_db_atomic(self):
        self.record()
        self.assertFalse(self.recover()["atomic_across_databases"])

    def test_chain_transactional(self):
        self.record()
        self.assertTrue(self.recover()["chain_append_transactional"])

    def test_reopen_after_recovery(self):
        self.record()
        self.recover()
        reopened = SQLiteAuditHashChainV1(self.chain.path)
        self.assertEqual(reopened.verify("alice", self.cid)["event_count"], 1)
