import unittest
import tempfile
import sqlite3
from pathlib import Path
from core.intelligence.persistent_memory_v2 import PersistentMemory
from core.intelligence.knowledge_acquisition_v2 import KnowledgeAcquisition
from core.intelligence.knowledge_v1 import KnowledgeStore, KnowledgeRecord, Evidence

class MemoryTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path=str(Path(self.tmp.name)/"memory.db")
        self.memory=PersistentMemory(self.path)
    def proposal(self,key="a",value="true",owner="alice",source="source"):
        return KnowledgeAcquisition(KnowledgeStore(self.memory.snapshot(owner).records)).propose(owner,KnowledgeRecord(key,value,Evidence.from_excerpt(source,value),owner))
    def commit(self,p,revision=0,owner="alice",approved=True):
        return self.memory.commit_reviewed(owner,p,expected_revision=revision,reviewer="reviewer",approved=approved)
    def test_restart(self):
        r=self.commit(self.proposal())
        self.assertEqual(r.revision,1)
        self.assertEqual(PersistentMemory(self.path).snapshot("alice"),r)
    def test_approval(self):
        with self.assertRaises(PermissionError):
            self.commit(self.proposal(),approved=False)
        self.assertEqual(self.memory.snapshot("alice").revision,0)
    def test_isolation(self):
        p=self.proposal()
        self.commit(p)
        self.assertEqual(self.memory.snapshot("bob").records,())
        with self.assertRaises(ValueError):
            self.commit(p,owner="bob")
    def test_stale(self):
        p=self.proposal("b")
        self.commit(self.proposal())
        with self.assertRaises(ValueError):
            self.commit(p)
        self.assertEqual(self.memory.snapshot("alice").revision,1)
    def test_conflict_duplicate(self):
        self.commit(self.proposal())
        for p in (self.proposal(),self.proposal(value="false")):
            with self.assertRaises(ValueError):
                self.commit(p,1)
        self.assertEqual(self.memory.snapshot("alice").revision,1)
    def test_additional_evidence(self):
        self.commit(self.proposal())
        self.assertEqual(self.commit(self.proposal(source="second"),1).revision,2)
    def test_corruption(self):
        self.commit(self.proposal())
        with sqlite3.connect(self.path) as db:
            db.execute("UPDATE intelligence_memory_v2 SET excerpt='tampered'")
        with self.assertRaises(ValueError):
            self.memory.snapshot("alice")
    def test_revision_gap(self):
        self.commit(self.proposal())
        with sqlite3.connect(self.path) as db:
            db.execute("UPDATE intelligence_memory_v2 SET revision=2")
        with self.assertRaises(ValueError):
            self.memory.snapshot("alice")
