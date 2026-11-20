import hashlib
import sqlite3
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from languages.en.learning.review_audit_v1 import SQLiteReviewAuditV1
from languages.en.learning.audit_hash_chain_v1 import SQLiteAuditHashChainV1
from languages.en.learning.audit_concurrent_consistency_v1 import check_concurrent_audit_consistency_v1


class ConcurrentAuditConsistencyV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.audit = SQLiteReviewAuditV1(root / "audit.sqlite")
        self.chain = SQLiteAuditHashChainV1(root / "chain.sqlite")
        self.cid = hashlib.sha256(b"concurrent-audit-check").hexdigest()

    def record(self, status="blocked"):
        event = self.audit.record("alice", {
            "contract": "future-xsus-core.staged-review-gate.v1",
            "candidate_id": self.cid, "status": status,
            "reasons": ["missing"] if status == "blocked" else [],
            "review_eligible_at_check": status == "ready_for_human_review",
            "release_authorized": False,
        })
        return event

    def append(self, status="blocked"):
        event = self.record(status)
        receipt = self.chain.append("alice", self.cid, event.sequence, event.status)
        return event, receipt

    def check(self, **kwargs):
        return check_concurrent_audit_consistency_v1(self.audit, self.chain, "alice", self.cid, **kwargs)

    def mutate(self, path, sql, params=()):
        with sqlite3.connect(path) as db:
            db.execute(sql, params)

    def test_empty_fails(self):
        self.assertEqual(self.check()["status"], "inconsistent_or_changed")

    def test_one_event_consistent(self):
        self.append()
        self.assertEqual(self.check()["status"], "consistent_at_check")

    def test_multiple_events_consistent(self):
        self.append()
        self.append("ready_for_human_review")
        self.assertEqual(self.check()["audit_count"], 2)

    def test_head_matches(self):
        _, receipt = self.append()
        self.assertEqual(self.check()["head"], receipt.digest)

    def test_expected_head_matches(self):
        _, receipt = self.append()
        self.assertEqual(self.check(expected_head=receipt.digest)["status"], "consistent_at_check")

    def test_wrong_expected_head_fails(self):
        self.append()
        self.assertIn("trusted_head_mismatch", self.check(expected_head="a"*64)["reasons"])

    def test_invalid_expected_head(self):
        with self.assertRaises(ValueError):
            self.check(expected_head="bad")

    def test_unbridged_event_fails(self):
        self.append()
        self.record()
        self.assertIn("audit_chain_count_mismatch", self.check()["reasons"])

    def test_extra_chain_fails(self):
        self.append()
        self.chain.append("alice", self.cid, 100, "blocked")
        self.assertIn("audit_chain_count_mismatch", self.check()["reasons"])

    def test_changed_audit_detected(self):
        self.append()
        result = self.check(between_snapshots=lambda: self.record())
        self.assertIn("audit_changed_during_check", result["reasons"])

    def test_changed_chain_detected(self):
        event = self.record()
        result = self.check(between_snapshots=lambda: self.chain.append("alice", self.cid, event.sequence, event.status))
        self.assertIn("chain_changed_during_check", result["reasons"])

    def test_both_changed_detected(self):
        self.append()
        result = self.check(between_snapshots=lambda: self.append())
        self.assertIn("audit_changed_during_check", result["reasons"])
        self.assertIn("chain_changed_during_check", result["reasons"])

    def test_audit_status_tampering_detected(self):
        event, _ = self.append()
        self.mutate(self.audit.path, "UPDATE xsus_review_audit_v1 SET status='ready_for_human_review' WHERE sequence=?", (event.sequence,))
        self.assertIn("audit_chain_event_mismatch", self.check()["reasons"])

    def test_chain_digest_tampering_detected(self):
        self.append()
        self.mutate(self.chain.path, "UPDATE xsus_audit_hash_chain_v1 SET digest=?", ("a"*64,))
        self.assertIn("chain_digest_invalid", self.check()["reasons"])

    def test_chain_link_tampering_detected(self):
        self.append()
        self.append()
        self.mutate(self.chain.path, "UPDATE xsus_audit_hash_chain_v1 SET previous_digest=? WHERE ordinal=2", ("a"*64,))
        self.assertIn("chain_digest_invalid", self.check()["reasons"])

    def test_corrupt_reasons_detected(self):
        event, _ = self.append()
        self.mutate(self.audit.path, "UPDATE xsus_review_audit_v1 SET reasons_json='{' WHERE sequence=?", (event.sequence,))
        self.assertIn("audit_reasons_invalid", self.check()["reasons"])

    def test_invalid_block_reasons_detected(self):
        event, _ = self.append()
        self.mutate(self.audit.path, "UPDATE xsus_review_audit_v1 SET reasons_json='[]' WHERE sequence=?", (event.sequence,))
        self.assertIn("audit_status_reasons_mismatch", self.check()["reasons"])

    def test_limit_enforced(self):
        self.append()
        self.append()
        self.assertIn("history_limit_exceeded", self.check(max_events=1)["reasons"])

    def test_boolean_limit_rejected(self):
        with self.assertRaises(ValueError):
            self.check(max_events=True)

    def test_invalid_hook_rejected(self):
        with self.assertRaises(ValueError):
            self.check(between_snapshots=123)

    def test_owner_isolation(self):
        self.append()
        result = check_concurrent_audit_consistency_v1(self.audit, self.chain, "bob", self.cid)
        self.assertEqual(result["audit_count"], 0)

    def test_fingerprints_stable(self):
        self.append()
        self.assertEqual(self.check()["audit_snapshot_sha256"], self.check()["audit_snapshot_sha256"])

    def test_fingerprints_change(self):
        self.append()
        before = self.check()["audit_snapshot_sha256"]
        self.append()
        self.assertNotEqual(before, self.check()["audit_snapshot_sha256"])

    def test_release_always_denied(self):
        self.append()
        self.assertFalse(self.check()["release_authorized"])

    def test_no_cross_database_atomicity_claim(self):
        self.append()
        self.assertFalse(self.check()["atomic_across_databases"])

    def test_invalid_audit_instance(self):
        with self.assertRaises(ValueError):
            check_concurrent_audit_consistency_v1(None, self.chain, "alice", self.cid)

    def test_invalid_chain_instance(self):
        with self.assertRaises(ValueError):
            check_concurrent_audit_consistency_v1(self.audit, None, "alice", self.cid)
