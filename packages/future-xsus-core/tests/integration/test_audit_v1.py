"""Audit integrity, append replay, corruption detection and stale writers."""
import json
import tempfile
import unittest
from pathlib import Path
from core.intelligence.audit_v1 import AuditJournal


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "audit.jsonl"

    def test_append_and_reopen(self):
        journal = AuditJournal(self.path)
        first = journal.append("alice", "v2", "registered")
        second = journal.append("alice", "v2", "approved_for_release_review")
        self.assertEqual(second.previous_hash, first.digest)
        self.assertEqual(len(AuditJournal(self.path).read_verified()), 2)

    def test_modified_record_rejected(self):
        journal = AuditJournal(self.path)
        journal.append("alice", "v2", "registered")
        line = json.loads(self.path.read_text().strip())
        line["action"] = "deployed"
        self.path.write_text(json.dumps(line) + "\n")
        with self.assertRaises(ValueError):
            AuditJournal(self.path)

    def test_truncated_line_rejected(self):
        self.path.write_text('{"sequence":')
        with self.assertRaises(json.JSONDecodeError):
            AuditJournal(self.path)

    def test_stale_writer_rejected(self):
        a = AuditJournal(self.path)
        b = AuditJournal(self.path)
        a.append("alice", "v2", "registered")
        with self.assertRaises(ValueError):
            b.append("alice", "v2", "reviewed")

    def test_sequence_monotonic(self):
        journal = AuditJournal(self.path)
        for index in range(5):
            journal.append("alice", "v2", "step_" + str(index))
        self.assertEqual(tuple(x.sequence for x in journal.read_verified()),
                         (1, 2, 3, 4, 5))

    def test_empty_journal(self):
        self.assertEqual(AuditJournal(self.path).read_verified(), ())


if __name__ == "__main__":
    unittest.main()
