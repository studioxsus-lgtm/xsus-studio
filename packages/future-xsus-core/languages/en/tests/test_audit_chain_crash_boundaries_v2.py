"""Process-kill tests at SQLite commit boundaries for audit chain receipts."""
import hashlib
import os
from pathlib import Path
import signal
import sqlite3
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest

from languages.en.learning.audit_hash_chain_v1 import SQLiteAuditHashChainV1, _GENESIS, _hash_event
from languages.en.learning.audit_chain_recovery_v2 import recover_audit_chain_tail_v2
from languages.en.learning.review_audit_v1 import SQLiteReviewAuditV1

_WORKER = r"""
import os, signal, sqlite3, sys
from languages.en.learning.audit_hash_chain_v1 import _GENESIS, _hash_event
path, owner, candidate, phase = sys.argv[1:]
db = sqlite3.connect(path, timeout=10)
db.execute('BEGIN IMMEDIATE')
previous = db.execute(
    'SELECT ordinal,digest FROM xsus_audit_hash_chain_v1 WHERE owner_id=? AND candidate_id=? ORDER BY ordinal DESC LIMIT 1',
    (owner, candidate)).fetchone()
ordinal = previous[0] + 1 if previous else 1
prior = previous[1] if previous else _GENESIS
seq = ordinal
digest = _hash_event(owner, candidate, ordinal, seq, 'blocked', prior)
if phase == 'before_insert':
    os.kill(os.getpid(), signal.SIGKILL)
db.execute('INSERT INTO xsus_audit_hash_chain_v1 VALUES (?,?,?,?,?,?,?)',
           (owner, candidate, ordinal, seq, 'blocked', prior, digest))
if phase == 'after_insert_before_commit':
    os.kill(os.getpid(), signal.SIGKILL)
db.commit()
if phase == 'after_commit':
    os.kill(os.getpid(), signal.SIGKILL)
raise ValueError('unknown phase')
"""


class AuditChainCrashBoundariesV2Tests(unittest.TestCase):
    def setUp(self):
        if os.name != "posix" or not hasattr(signal, "SIGKILL"):
            self.skipTest("POSIX SIGKILL required")
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.audit = SQLiteReviewAuditV1(root / "audit.sqlite")
        self.chain = SQLiteAuditHashChainV1(root / "chain.sqlite")
        self.cid = hashlib.sha256(b"english-crash-boundaries-v2").hexdigest()

    def record(self):
        return self.audit.record("alice", {
            "contract": "future-xsus-core.staged-review-gate.v1",
            "candidate_id": self.cid, "status": "blocked",
            "reasons": ["missing"],
            "review_eligible_at_check": False,
            "release_authorized": False,
        })

    def kill_at(self, phase):
        proc = subprocess.run(
            [sys.executable, "-c", _WORKER, str(self.chain.path), "alice", self.cid, phase],
            capture_output=True, text=True, timeout=15,
        )
        self.assertEqual(proc.returncode, -signal.SIGKILL, proc.stderr)

    def recover(self):
        return recover_audit_chain_tail_v2(self.audit, self.chain, "alice", self.cid)

    def count(self):
        return self.chain.verify("alice", self.cid)["event_count"]

    def test_before_insert_rolls_back(self):
        self.kill_at("before_insert")
        self.assertEqual(self.count(), 0)

    def test_after_insert_before_commit_rolls_back(self):
        self.kill_at("after_insert_before_commit")
        self.assertEqual(self.count(), 0)

    def test_after_commit_survives(self):
        self.kill_at("after_commit")
        self.assertEqual(self.count(), 1)

    def test_after_commit_digest_valid(self):
        self.kill_at("after_commit")
        self.assertEqual(self.chain.verify("alice", self.cid)["status"], "consistent_at_check")

    def test_before_insert_then_recover(self):
        self.record()
        self.kill_at("before_insert")
        self.assertEqual(self.recover()["recovered_events"], 1)

    def test_after_insert_then_recover(self):
        self.record()
        self.kill_at("after_insert_before_commit")
        self.assertEqual(self.recover()["recovered_events"], 1)

    def test_after_commit_then_recover_is_idempotent(self):
        self.record()
        self.kill_at("after_commit")
        self.assertEqual(self.recover()["recovered_events"], 0)

    def test_after_commit_then_reconcile(self):
        self.record()
        self.kill_at("after_commit")
        self.assertEqual(self.recover()["status"], "consistent_at_check")

    def test_lock_released_after_each_phase(self):
        for phase in ("before_insert", "after_insert_before_commit", "after_commit"):
            self.kill_at(phase) if phase != "after_commit" else None
        self.record()
        self.recover()
        self.assertEqual(self.count(), 1)

    def test_multiple_uncommitted_attempts(self):
        self.record()
        for _ in range(3):
            self.kill_at("after_insert_before_commit")
        self.assertEqual(self.recover()["recovered_events"], 1)

    def test_committed_receipt_survives_reopen(self):
        self.kill_at("after_commit")
        reopened = SQLiteAuditHashChainV1(self.chain.path)
        self.assertEqual(reopened.verify("alice", self.cid)["event_count"], 1)

    def test_uncommitted_attempt_does_not_change_existing_head(self):
        first = self.record()
        receipt = self.chain.append("alice", self.cid, first.sequence, first.status)
        self.kill_at("after_insert_before_commit")
        self.assertEqual(self.chain.verify("alice", self.cid)["head"], receipt.digest)

    def test_uncommitted_attempt_does_not_duplicate_existing(self):
        first = self.record()
        self.chain.append("alice", self.cid, first.sequence, first.status)
        self.kill_at("after_insert_before_commit")
        self.assertEqual(self.count(), 1)

    def test_recovery_never_authorizes_release(self):
        self.record()
        self.kill_at("after_insert_before_commit")
        self.assertFalse(self.recover()["release_authorized"])

    def test_after_commit_recovery_never_authorizes_release(self):
        self.record()
        self.kill_at("after_commit")
        self.assertFalse(self.recover()["release_authorized"])
