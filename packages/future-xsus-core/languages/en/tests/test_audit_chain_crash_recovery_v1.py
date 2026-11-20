"""Subprocess crash-injection tests for the SQLite audit receipt chain."""
import hashlib
import os
from pathlib import Path
import signal
import sqlite3
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest

from languages.en.learning.review_audit_v1 import SQLiteReviewAuditV1
from languages.en.learning.audit_hash_chain_v1 import SQLiteAuditHashChainV1
from languages.en.learning.audit_chain_recovery_v2 import recover_audit_chain_tail_v2


# Each worker is a separate Python interpreter, not a thread.
_WORKER = r"""
import os, signal, sqlite3, sys
path, owner, candidate, mode = sys.argv[1:]
db = sqlite3.connect(path, timeout=5)
db.execute('BEGIN IMMEDIATE')
if mode == 'insert':
    db.execute('INSERT INTO xsus_audit_hash_chain_v1 VALUES (?,?,?,?,?,?,?)',
               (owner, candidate, 1, 1, 'blocked', '0'*64, 'a'*64))
elif mode == 'delete':
    db.execute('DELETE FROM xsus_audit_hash_chain_v1 WHERE owner_id=? AND candidate_id=?',
               (owner, candidate))
else:
    raise ValueError('unknown crash mode')
# The uncommitted transaction must disappear on process death.
os.kill(os.getpid(), signal.SIGKILL)
"""


class AuditChainCrashRecoveryV1Tests(unittest.TestCase):
    def setUp(self):
        if not hasattr(signal, "SIGKILL") or os.name != "posix":
            self.skipTest("SIGKILL process semantics require POSIX")
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.audit = SQLiteReviewAuditV1(root / "audit.sqlite")
        self.chain = SQLiteAuditHashChainV1(root / "chain.sqlite")
        self.cid = hashlib.sha256(b"english-crash-recovery").hexdigest()

    def record(self, status="blocked"):
        return self.audit.record("alice", {
            "contract": "future-xsus-core.staged-review-gate.v1",
            "candidate_id": self.cid, "status": status,
            "reasons": ["missing"] if status == "blocked" else [],
            "review_eligible_at_check": status == "ready_for_human_review",
            "release_authorized": False,
        })

    def recover(self):
        return recover_audit_chain_tail_v2(self.audit, self.chain, "alice", self.cid)

    def crash_worker(self, mode):
        proc = subprocess.run(
            [sys.executable, "-c", _WORKER, str(self.chain.path), "alice", self.cid, mode],
            capture_output=True, text=True, timeout=15,
        )
        self.assertEqual(proc.returncode, -signal.SIGKILL, proc.stderr)

    def count(self):
        with sqlite3.connect(self.chain.path) as db:
            return db.execute("SELECT COUNT(*) FROM xsus_audit_hash_chain_v1").fetchone()[0]

    def test_killed_uncommitted_insert_rolls_back(self):
        self.crash_worker("insert")
        self.assertEqual(self.count(), 0)

    def test_killed_insert_then_recovery(self):
        self.record()
        self.crash_worker("insert")
        self.assertEqual(self.recover()["recovered_events"], 1)

    def test_killed_insert_then_chain_verifies(self):
        self.record()
        self.crash_worker("insert")
        self.recover()
        self.assertEqual(self.chain.verify("alice", self.cid)["status"], "consistent_at_check")

    def test_killed_insert_does_not_leave_sqlite_lock(self):
        self.crash_worker("insert")
        self.record()
        self.recover()
        self.assertEqual(self.count(), 1)

    def test_killed_uncommitted_delete_rolls_back(self):
        self.record()
        self.recover()
        self.crash_worker("delete")
        self.assertEqual(self.count(), 1)

    def test_killed_delete_preserves_head(self):
        self.record()
        self.recover()
        head = self.chain.verify("alice", self.cid)["head"]
        self.crash_worker("delete")
        self.assertEqual(self.chain.verify("alice", self.cid)["head"], head)

    def test_killed_delete_then_idempotent_recovery(self):
        self.record()
        self.recover()
        self.crash_worker("delete")
        self.assertEqual(self.recover()["recovered_events"], 0)

    def test_multiple_killed_transactions(self):
        self.record()
        for _ in range(3):
            self.crash_worker("insert")
        self.assertEqual(self.recover()["recovered_events"], 1)

    def test_recovery_persists_after_reopen(self):
        self.record()
        self.crash_worker("insert")
        self.recover()
        reopened = SQLiteAuditHashChainV1(self.chain.path)
        self.assertEqual(reopened.verify("alice", self.cid)["event_count"], 1)

    def test_multiple_audit_events_after_crash(self):
        self.record()
        self.record("ready_for_human_review")
        self.crash_worker("insert")
        self.assertEqual(self.recover()["recovered_events"], 2)

    def test_post_crash_recovery_does_not_authorize_release(self):
        self.record()
        self.crash_worker("insert")
        self.assertFalse(self.recover()["release_authorized"])

    def test_post_crash_recovery_still_nonatomic_across_databases(self):
        self.record()
        self.crash_worker("insert")
        self.assertFalse(self.recover()["atomic_across_databases"])
