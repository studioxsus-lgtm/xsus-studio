import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch
from core.intelligence.runtime_v2 import IntelligenceRuntime
from core.intelligence.persistent_memory_v2 import PersistentMemory
from core.intelligence.knowledge_v1 import KnowledgeStore, KnowledgeRecord, Evidence
from core.intelligence.knowledge_acquisition_v2 import KnowledgeAcquisition
from core.intelligence.request_router_v2 import RouterPrincipal
from core.intelligence.reasoning_v1 import Rule

class RuntimeTests(unittest.TestCase):
    def setUp(self):
        tmp=tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.memory=PersistentMemory(str(Path(tmp.name)/"mem.db"))
        self.runtime=IntelligenceRuntime(self.memory,capacity=1)
        self.alice=RouterPrincipal("alice",frozenset(("reason","infer","solve","search")))
    def test_english(self):
        r=self.runtime.english(self.alice,"req","prove b",facts=("a",),rules=(Rule(("a",),"b"),))
        self.assertEqual(r.response.status,"resolved")
        self.assertFalse(r.response.execution_authorized)
        self.assertEqual(r.memory_revision,0)
    def test_structured(self):
        r=self.runtime.structured(self.alice,{"version":"2.0.0","request_id":"req","operation":"solve","payload":{"goals":("a","b"),"facts":("a",),"rules":()}})
        self.assertEqual(r.response.status,"partial")
    def test_memory_freshness(self):
        self.assertEqual(self.runtime.english(self.alice,"req","infer a from my knowledge").response.status,"abstained")
        p=KnowledgeAcquisition(KnowledgeStore()).propose("alice",KnowledgeRecord("a","true",Evidence.from_excerpt("source","a"),"alice"))
        self.memory.commit_reviewed("alice",p,expected_revision=0,reviewer="reviewer",approved=True)
        r=self.runtime.english(self.alice,"req","infer a from my knowledge")
        self.assertEqual((r.response.status,r.memory_revision),("resolved",1))
        bob=RouterPrincipal("bob",frozenset(("infer",)))
        r=self.runtime.english(bob,"req","infer a from my knowledge")
        self.assertEqual((r.response.status,r.memory_revision),("abstained",0))
    def test_unknown(self):
        self.assertEqual(self.runtime.english(self.alice,"req","invent a fact").response.operation,"unrecognized")
    def test_permission(self):
        with self.assertRaises(PermissionError):
            self.runtime.english(RouterPrincipal("alice",frozenset()),"req","prove a")
        self.assertEqual(self.runtime.english(self.alice,"req","prove a",facts=("a",)).response.status,"resolved")
    def test_capacity(self):
        original=self.memory.snapshot
        def nested(owner):
            with self.assertRaisesRegex(RuntimeError,"capacity"):
                self.runtime.english(self.alice,"other","prove a")
            return original(owner)
        with patch.object(self.memory,"snapshot",side_effect=nested):
            self.runtime.english(self.alice,"req","prove a")
        self.assertEqual(self.runtime.english(self.alice,"req","prove a").response.status,"abstained")
    def test_invalid(self):
        with self.assertRaises(PermissionError):
            self.runtime.english(None,"req","prove a")
        with self.assertRaises(ValueError):
            self.runtime.structured(self.alice,{})
    def test_memory_failure_recovery(self):
        with patch.object(self.memory,"snapshot",side_effect=ValueError("corrupt")):
            with self.assertRaises(ValueError):
                self.runtime.english(self.alice,"req","prove a")
        self.assertEqual(self.runtime.english(self.alice,"req","prove a").response.status,"abstained")
