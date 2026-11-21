"""Cooperative multiprocess audit serialization and lock-path safeguards."""
import multiprocessing
import os
import tempfile
import unittest
from pathlib import Path
from core.intelligence.locked_audit_v1 import LockedAuditJournal


def writer(path, index, count, results):
    try:
        journal = LockedAuditJournal(path)
        for step in range(count):
            journal.append("alice", "candidate", "worker_%s_step_%s" % (index, step))
        results.put(None)
    except Exception as exc:
        results.put(type(exc).__name__ + ":" + str(exc))


@unittest.skipUnless(os.name == "posix", "requires POSIX flock")
class LockedAuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "audit.jsonl"

    def test_concurrent_writers_preserve_chain(self):
        ctx = multiprocessing.get_context("spawn")
        results = ctx.Queue()
        processes = [ctx.Process(target=writer, args=(str(self.path), i, 8, results))
                     for i in range(4)]
        for process in processes:
            process.start()
        for process in processes:
            process.join(timeout=25)
            if process.is_alive():
                process.terminate()
                process.join()
            self.assertEqual(process.exitcode, 0)
        self.assertEqual([results.get(timeout=3) for _ in processes], [None] * 4)
        records = LockedAuditJournal(self.path).read_verified()
        self.assertEqual(len(records), 32)
        self.assertEqual(tuple(record.sequence for record in records), tuple(range(1, 33)))

    def test_sequential_append(self):
        journal = LockedAuditJournal(self.path)
        self.assertEqual(journal.append("alice", "candidate", "created").sequence, 1)
        self.assertEqual(journal.append("alice", "candidate", "reviewed").sequence, 2)

    def test_symlink_lock_rejected(self):
        target = Path(self.temp.name) / "other"
        target.write_text("not a lock")
        self.path.with_name(self.path.name + ".lock").symlink_to(target)
        with self.assertRaises(OSError):
            LockedAuditJournal(self.path).append("alice", "candidate", "created")

    def test_corrupted_journal_blocks_append(self):
        self.path.write_text('{"broken":')
        with self.assertRaises(ValueError):
            LockedAuditJournal(self.path).append("alice", "candidate", "created")


if __name__ == "__main__":
    unittest.main()
