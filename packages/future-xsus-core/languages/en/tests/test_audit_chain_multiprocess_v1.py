"""Independent-process concurrency tests for audit chain tail recovery."""
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest

from languages.en.learning.review_audit_v1 import SQLiteReviewAuditV1
from languages.en.learning.audit_hash_chain_v1 import SQLiteAuditHashChainV1
from languages.en.learning.audit_chain_recovery_v2 import recover_audit_chain_tail_v2
from languages.en.learning.audit_chain_bridge_v1 import reconcile_review_audit_chain_v1

_WORKER = r"""
import json, sys
from languages.en.learning.review_audit_v1 import SQLiteReviewAuditV1
from languages.en.learning.audit_hash_chain_v1 import SQLiteAuditHashChainV1
from languages.en.learning.audit_chain_recovery_v2 import recover_audit_chain_tail_v2
audit_path, chain_path, owner, candidate = sys.argv[1:]
result = recover_audit_chain_tail_v2(
    SQLiteReviewAuditV1(audit_path), SQLiteAuditHashChainV1(chain_path),
    owner, candidate,
)
print(json.dumps(result))
"""


class AuditChainMultiprocessV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.audit = SQLiteReviewAuditV1(root / "audit.sqlite")
        self.chain = SQLiteAuditHashChainV1(root / "chain.sqlite")
        self.cid = hashlib.sha256(b"english-multiprocess-v1").hexdigest()

    def record(self, status="blocked"):
        return self.audit.record("alice", {
            "contract": "future-xsus-core.staged-review-gate.v1",
            "candidate_id": self.cid, "status": status,
            "reasons": ["missing"] if status == "blocked" else [],
            "review_eligible_at_check": status == "ready_for_human_review",
            "release_authorized": False,
        })

    def workers(self, count=4):
        commands = [
            [sys.executable, "-c", _WORKER, str(self.audit.path), str(self.chain.path), "alice", self.cid]
            for _ in range(count)
        ]
        processes = [
            subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            for cmd in commands
        ]
        results = []
        try:
            for process in processes:
                stdout, stderr = process.communicate(timeout=25)
                self.assertEqual(process.returncode, 0, stderr)
                results.append(json.loads(stdout))
        finally:
            for process in processes:
                if process.poll() is None:
                    process.kill()
                    process.communicate()
        return results

    def verify(self):
        return self.chain.verify("alice", self.cid)

    def reconcile(self):
        return reconcile_review_audit_chain_v1(self.audit, self.chain, "alice", self.cid)

    def test_four_processes_recover_once(self):
        for _ in range(12):
            self.record()
        results = self.workers()
        self.assertEqual(sum(item["recovered_events"] for item in results), 12)

    def test_four_processes_preserve_count(self):
        for _ in range(12):
            self.record()
        self.workers()
        self.assertEqual(self.verify()["event_count"], 12)

    def test_four_processes_chain_integrity(self):
        for _ in range(8):
            self.record()
        self.workers()
        self.assertEqual(self.verify()["status"], "consistent_at_check")

    def test_four_processes_reconcile(self):
        for _ in range(8):
            self.record()
        self.workers()
        self.assertEqual(self.reconcile()["status"], "consistent_at_check")

    def test_four_processes_all_report_consistent(self):
        for _ in range(8):
            self.record()
        results = self.workers()
        self.assertTrue(all(item["status"] == "consistent_at_check" for item in results))

    def test_two_processes_with_existing_prefix(self):
        first = self.record()
        self.chain.append("alice", self.cid, first.sequence, first.status)
        for _ in range(6):
            self.record()
        results = self.workers(2)
        self.assertEqual(sum(item["recovered_events"] for item in results), 6)

    def test_repeated_process_rounds_idempotent(self):
        for _ in range(5):
            self.record()
        self.workers(3)
        results = self.workers(3)
        self.assertEqual(sum(item["recovered_events"] for item in results), 0)

    def test_mixed_statuses(self):
        for index in range(10):
            self.record("ready_for_human_review" if index % 2 else "blocked")
        self.workers(4)
        self.assertEqual(self.reconcile()["status"], "consistent_at_check")

    def test_processes_never_authorize_release(self):
        for _ in range(4):
            self.record()
        results = self.workers(3)
        self.assertTrue(all(item["release_authorized"] is False for item in results))

    def test_processes_not_cross_db_atomic(self):
        for _ in range(4):
            self.record()
        results = self.workers(3)
        self.assertTrue(all(item["atomic_across_databases"] is False for item in results))

    def test_chain_survives_reopen(self):
        for _ in range(6):
            self.record()
        self.workers()
        reopened = SQLiteAuditHashChainV1(self.chain.path)
        self.assertEqual(reopened.verify("alice", self.cid)["event_count"], 6)

    def test_no_duplicate_audit_sequences(self):
        for _ in range(9):
            self.record()
        self.workers()
        with sqlite3.connect(self.chain.path) as db:
            sequences = [row[0] for row in db.execute(
                "SELECT audit_sequence FROM xsus_audit_hash_chain_v1 ORDER BY ordinal"
            ).fetchall()]
        self.assertEqual(len(sequences), len(set(sequences)))

    def test_chain_ordinals_are_contiguous(self):
        for _ in range(9):
            self.record()
        self.workers()
        with sqlite3.connect(self.chain.path) as db:
            ordinals = [row[0] for row in db.execute(
                "SELECT ordinal FROM xsus_audit_hash_chain_v1 ORDER BY ordinal"
            ).fetchall()]
        self.assertEqual(ordinals, list(range(1, 10)))

    def test_after_concurrent_round_new_tail_recovers(self):
        for _ in range(4):
            self.record()
        self.workers()
        for _ in range(3):
            self.record()
        results = self.workers()
        self.assertEqual(sum(item["recovered_events"] for item in results), 3)

    def test_existing_head_preserved(self):
        first = self.record()
        receipt = self.chain.append("alice", self.cid, first.sequence, first.status)
        for _ in range(4):
            self.record()
        self.workers()
        with sqlite3.connect(self.chain.path) as db:
            head = db.execute(
                "SELECT digest FROM xsus_audit_hash_chain_v1 WHERE ordinal=1"
            ).fetchone()[0]
        self.assertEqual(head, receipt.digest)
