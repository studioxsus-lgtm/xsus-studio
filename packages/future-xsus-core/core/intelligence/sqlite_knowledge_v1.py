"""Durable owner-scoped evidence records with atomic bounded SQLite writes.

Source digests verify local integrity, never the authenticity or truth of sources.
"""
import sqlite3
from pathlib import Path
from .knowledge_v1 import (
    Evidence, KnowledgeRecord, KnowledgeStore, MAX_RECORDS, _id,
)


class SQLiteKnowledgeStore:
    def __init__(self, path: str):
        if not isinstance(path, str) or not path or path == ":memory:":
            raise ValueError("persistent SQLite file path required")
        self.path = str(Path(path))
        with self._connect() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS knowledge_records (
                record_id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                source_id TEXT NOT NULL,
                excerpt TEXT NOT NULL,
                digest TEXT NOT NULL
            )""")
            db.execute("""CREATE INDEX IF NOT EXISTS knowledge_owner_key
                          ON knowledge_records(owner_id, key)""")

    def _connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.execute("PRAGMA busy_timeout=10000")
        return db

    def add(self, record: KnowledgeRecord) -> None:
        if not isinstance(record, KnowledgeRecord) or not record.evidence.valid():
            raise ValueError("invalid evidence record")
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            count = db.execute("SELECT COUNT(*) FROM knowledge_records").fetchone()[0]
            if count >= MAX_RECORDS:
                raise ValueError("knowledge store full")
            db.execute("""INSERT INTO knowledge_records
                (owner_id, key, value, source_id, excerpt, digest)
                VALUES (?, ?, ?, ?, ?, ?)""",
                (record.owner_id, record.key, record.value,
                 record.evidence.source_id, record.evidence.excerpt,
                 record.evidence.digest))

    def records_for_owner(self, owner_id: str) -> tuple[KnowledgeRecord, ...]:
        owner_id = _id(owner_id)
        with self._connect() as db:
            rows = db.execute("""SELECT key, value, source_id, excerpt, digest
                FROM knowledge_records WHERE owner_id = ?
                ORDER BY record_id""", (owner_id,)).fetchall()
        records = []
        for key, value, source_id, excerpt, digest in rows:
            evidence = Evidence(source_id, excerpt, digest)
            if not evidence.valid():
                raise ValueError("stored evidence integrity failure")
            records.append(KnowledgeRecord(key, value, evidence, owner_id))
        return tuple(records)

    def query(self, owner_id: str, key: str):
        owner_id, key = _id(owner_id), _id(key)
        # Verify all owner records, including corrupted unrelated records,
        # before issuing an answer from this owner's knowledge snapshot.
        return KnowledgeStore(self.records_for_owner(owner_id)).query(owner_id, key)
