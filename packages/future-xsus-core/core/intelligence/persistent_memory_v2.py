"""Local append-only knowledge memory. Trusted service must authenticate reviewers."""
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from .knowledge_v1 import KnowledgeStore, KnowledgeRecord, Evidence, MAX_RECORDS, _id
from .knowledge_acquisition_v2 import KnowledgeAcquisition

@dataclass(frozen=True, slots=True)
class MemorySnapshot:
    revision: int
    records: tuple

class PersistentMemory:
    def __init__(self,path):
        if type(path) is not str or not path.strip() or path == ":memory:":
            raise ValueError("Persistent path required")
        self.path=path
        with self._db() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS intelligence_memory_v2 (
                owner TEXT NOT NULL, revision INTEGER NOT NULL,
                key TEXT NOT NULL, value TEXT NOT NULL, source TEXT NOT NULL,
                excerpt TEXT NOT NULL, digest TEXT NOT NULL,
                proposal TEXT NOT NULL, reviewer TEXT NOT NULL,
                PRIMARY KEY(owner,revision), UNIQUE(owner,proposal))""")

    @contextmanager
    def _db(self):
        db=sqlite3.connect(self.path,timeout=10)
        try:
            with db:
                yield db
        finally:
            db.close()

    def _snapshot(self,db,owner):
        rows=db.execute("""SELECT revision,key,value,source,excerpt,digest
            FROM intelligence_memory_v2 WHERE owner=? ORDER BY revision LIMIT 513""",(owner,)).fetchall()
        if len(rows)>MAX_RECORDS:
            raise ValueError("Memory capacity exceeded")
        records=[]
        for expected,(revision,key,value,source,excerpt,digest) in enumerate(rows,1):
            if revision!=expected:
                raise ValueError("Revision integrity failure")
            records.append(KnowledgeRecord(key,value,Evidence(source,excerpt,digest),owner))
        return MemorySnapshot(len(rows),tuple(records))

    def snapshot(self,owner):
        _id(owner)
        with self._db() as db:
            return self._snapshot(db,owner)

    def commit_reviewed(self,owner,proposal,*,expected_revision,reviewer,approved):
        _id(owner)
        _id(reviewer)
        if approved is not True:
            raise PermissionError("Explicit approval required")
        if type(expected_revision) is not int or expected_revision<0:
            raise ValueError("Invalid revision")
        with self._db() as db:
            db.execute("BEGIN IMMEDIATE")
            current=self._snapshot(db,owner)
            if current.revision!=expected_revision:
                raise ValueError("Stale revision")
            engine=KnowledgeAcquisition(KnowledgeStore(current.records))
            if not engine.verify(owner,proposal):
                raise ValueError("Invalid or stale proposal")
            if proposal.status not in ("new_knowledge_review_required","additional_evidence_review_required"):
                raise ValueError("Conflict or duplicate cannot be committed")
            if current.revision>=MAX_RECORDS:
                raise ValueError("Memory capacity exceeded")
            r=proposal.record
            db.execute("INSERT INTO intelligence_memory_v2 VALUES (?,?,?,?,?,?,?,?,?)",
                (owner,current.revision+1,r.key,r.value,r.evidence.source_id,
                 r.evidence.excerpt,r.evidence.digest,proposal.proposal_id,reviewer))
            return MemorySnapshot(current.revision+1,current.records+(r,))
