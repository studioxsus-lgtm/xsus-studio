"""SQLite knowledge persistence, isolation, conflict and integrity tests."""
import sqlite3
import tempfile
import unittest
from pathlib import Path
from core.intelligence.knowledge_v1 import Evidence, KnowledgeRecord
from core.intelligence.sqlite_knowledge_v1 import SQLiteKnowledgeStore


def record(owner, key, value, source="source"):
    return KnowledgeRecord(key, value, Evidence.from_excerpt(source, value), owner)


class SQLiteKnowledgeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = str(Path(self.tmp.name) / "knowledge.sqlite")
        self.store = SQLiteKnowledgeStore(self.path)

    def test_persists_across_instances(self):
        self.store.add(record("alice", "status", "ready"))
        reopened = SQLiteKnowledgeStore(self.path)
        self.assertEqual(reopened.query("alice", "status").value, "ready")

    def test_unknown(self):
        self.assertEqual(self.store.query("alice", "missing").status, "unknown")

    def test_owner_isolation(self):
        self.store.add(record("alice", "status", "secret"))
        self.assertEqual(self.store.query("bob", "status").status, "unknown")

    def test_conflict(self):
        self.store.add(record("alice", "status", "ready", "first"))
        self.store.add(record("alice", "status", "blocked", "second"))
        self.assertEqual(self.store.query("alice", "status").status, "conflict")

    def test_sources_retained(self):
        self.store.add(record("alice", "status", "ready", "first"))
        self.store.add(record("alice", "status", "ready", "second"))
        self.assertEqual(self.store.query("alice", "status").sources, ("first", "second"))

    def test_corrupted_digest_fails_closed(self):
        self.store.add(record("alice", "status", "ready"))
        with sqlite3.connect(self.path) as db:
            db.execute("UPDATE knowledge_records SET digest='invalid'")
        with self.assertRaises(ValueError):
            self.store.query("alice", "status")

    def test_corrupted_excerpt_fails_closed(self):
        self.store.add(record("alice", "status", "ready"))
        with sqlite3.connect(self.path) as db:
            db.execute("UPDATE knowledge_records SET excerpt='tampered'")
        with self.assertRaises(ValueError):
            self.store.records_for_owner("alice")

    def test_invalid_owner_rejected(self):
        with self.assertRaises(ValueError):
            self.store.query("../alice", "status")

    def test_invalid_record_rejected(self):
        with self.assertRaises(ValueError):
            self.store.add(None)

    def test_record_order(self):
        self.store.add(record("alice", "first", "one"))
        self.store.add(record("alice", "second", "two"))
        self.assertEqual(tuple(r.key for r in self.store.records_for_owner("alice")),
                         ("first", "second"))

    def test_no_automatic_promotion(self):
        self.store.add(record("alice", "status", "ready"))
        self.assertFalse(self.store.query("alice", "status").verified)


if __name__ == "__main__":
    unittest.main()
