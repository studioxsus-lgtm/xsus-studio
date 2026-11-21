"""Actual SIGKILL of a subprocess at four durable transaction boundaries."""
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from core.intelligence.audit_v1 import AuditJournal
from core.intelligence.persistent_governance_v1 import PersistentGovernance
from core.intelligence.transactional_governance_v1 import TransactionalGovernance


@unittest.skipUnless(os.name == "posix" and hasattr(signal, "SIGKILL"),
                     "requires POSIX SIGKILL")
class RealCrashTests(unittest.TestCase):
    def run_boundary(self, point):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            ready = root / "ready"
            process = subprocess.Popen(
                [sys.executable, "-m",
                 "core.intelligence.crash_worker_v1", directory, point, str(ready)],
                stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            try:
                deadline = time.monotonic() + 12
                while not ready.exists() and process.poll() is None and time.monotonic() < deadline:
                    time.sleep(0.02)
                if not ready.exists():
                    stderr = process.stderr.read().decode(errors="replace") if process.poll() is not None else "worker timed out"
                    self.fail("worker did not reach boundary: " + stderr[:500])
                self.assertEqual(ready.read_text(), point)
                process.kill()
                process.wait(timeout=5)
                self.assertEqual(process.returncode, -signal.SIGKILL)
                tx = TransactionalGovernance(root / "snapshot.json", root / "audit.jsonl")
                recovered = tx.recover()
                self.assertEqual(tx.recover(), ())
                record = PersistentGovernance(root / "snapshot.json").registry.get(
                    "owner", "candidate")
                entries = AuditJournal(root / "audit.jsonl").read_verified()
                return recovered, record.status, len(entries)
            finally:
                if process.poll() is None:
                    process.kill()
                    process.wait(timeout=5)
                process.stderr.close()

    def test_kill_before_prepare(self):
        recovered, status, count = self.run_boundary("before_prepare")
        self.assertEqual((recovered, status, count), ((), "pending_review", 0))

    def test_kill_after_prepare(self):
        recovered, status, count = self.run_boundary("after_prepare")
        self.assertEqual((recovered, status, count),
                         ((("owner", "candidate", "abort"),), "pending_review", 2))

    def test_kill_after_snapshot(self):
        recovered, status, count = self.run_boundary("after_snapshot")
        self.assertEqual((recovered, status, count),
                         ((("owner", "candidate", "commit"),),
                          "approved_for_release_review", 2))

    def test_kill_after_commit(self):
        recovered, status, count = self.run_boundary("after_commit")
        self.assertEqual((recovered, status, count),
                         ((), "approved_for_release_review", 2))


if __name__ == "__main__":
    unittest.main()
