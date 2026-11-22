import unittest
import tempfile
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from core.intelligence.persistent_memory_v2 import PersistentMemory
from core.intelligence.knowledge_v1 import KnowledgeStore, KnowledgeRecord, Evidence
from core.intelligence.knowledge_acquisition_v2 import KnowledgeAcquisition
from core.intelligence.runtime_v2 import IntelligenceRuntime
from core.intelligence.request_router_v2 import RouterPrincipal
from core.intelligence.xsus_app_adapter_v2 import XSUSAppIntelligenceAdapterV2
from core.intelligence.semantic_reasoning_v2 import SemanticReasoner, ConceptRelation

class FullRuntimeValidation(unittest.TestCase):
    def setUp(self):
        tmp=tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.path=str(Path(tmp.name)/"memory.sqlite")
        self.memory=PersistentMemory(self.path)
        self.adapter=XSUSAppIntelligenceAdapterV2(IntelligenceRuntime(self.memory,capacity=8),enabled=True)
    def principal(self,owner):
        return RouterPrincipal(owner,frozenset(("reason","infer","solve","search")))
    def proposal(self,owner,key):
        return KnowledgeAcquisition(KnowledgeStore(self.memory.snapshot(owner).records)).propose(owner,KnowledgeRecord(key,"true",Evidence.from_excerpt("source",key),owner))
    def respond(self,owner,text,facts=(),rules=(),request="req"):
        return self.adapter.respond(self.principal(owner),{"contractVersion":"2.0.0","requestId":request,"text":text,"facts":list(facts),"rules":list(rules)})
    def test_semantic_memory_adapter(self):
        semantic=SemanticReasoner((ConceptRelation("car","vehicle","subtype"),ConceptRelation("vehicle","transport","subtype")))
        s=semantic.infer(("car",),("transport",))
        self.assertTrue(s.results[0].entailed)
        self.assertTrue(semantic.verify(s,("car",),("transport",)))
        self.memory.commit_reviewed("alice",self.proposal("alice","car"),expected_revision=0,reviewer="reviewer",approved=True)
        rules=[{"premises":list(r.premises),"conclusion":r.conclusion} for r in s.compiled_rules]
        self.adapter=XSUSAppIntelligenceAdapterV2(IntelligenceRuntime(PersistentMemory(self.path)),enabled=True)
        a=self.respond("alice","infer transport from my knowledge",rules=rules)
        b=self.respond("bob","infer transport from my knowledge",rules=rules)
        self.assertEqual((a["status"],a["memoryRevision"]),("resolved",1))
        self.assertEqual((b["status"],b["memoryRevision"]),("abstained",0))
        self.assertFalse(a["executionAuthorized"] or a["externalTruthVerified"])
    def test_concurrent_revision_race(self):
        proposals=[self.proposal("alice",k) for k in ("a","b")]
        barrier=Barrier(2)
        def commit(p):
            memory=PersistentMemory(self.path)
            barrier.wait(timeout=10)
            try:
                memory.commit_reviewed("alice",p,expected_revision=0,reviewer="reviewer",approved=True)
                return "committed"
            except ValueError as e:
                self.assertEqual(str(e),"Stale revision")
                return "stale"
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertCountEqual(list(pool.map(commit,proposals)),["committed","stale"])
        self.assertEqual(PersistentMemory(self.path).snapshot("alice").revision,1)
    def test_parallel_isolation(self):
        for i in range(8):
            owner=f"user{i}"
            self.memory.commit_reviewed(owner,self.proposal(owner,f"fact{i}"),expected_revision=0,reviewer="reviewer",approved=True)
        def check(i):
            owner=f"user{i}"
            a=self.respond(owner,f"infer fact{i} from my knowledge",request=f"own{i}")
            b=self.respond(owner,f"infer fact{(i+1)%8} from my knowledge",request=f"other{i}")
            return a["status"],b["status"],a["requestId"],b["requestId"]
        with ThreadPoolExecutor(max_workers=8) as pool:
            rows=list(pool.map(check,range(8)))
        self.assertEqual(rows,[("resolved","abstained",f"own{i}",f"other{i}") for i in range(8)])
    def test_deep_reasoning_and_search(self):
        rules=[{"premises":[f"a{i}"],"conclusion":f"a{i+1}"} for i in range(256)]
        r=self.respond("alice","prove a256",("a0",),rules)
        self.assertEqual(r["status"],"resolved")
        self.assertIn("257 proof steps",r["text"])
        self.assertEqual(self.respond("alice","solve a256 and missing",("a0",),rules)["status"],"partial")
        self.assertEqual(self.respond("alice","find alternative proofs for a1",("a0",),rules)["status"],"resolved")
    def test_repeated_requests(self):
        for i in range(128):
            r=self.respond("alice","prove a",("a",) if i%2==0 else (),request=f"req{i}")
            self.assertEqual(r["status"],"resolved" if i%2==0 else "abstained")
            self.assertEqual(r["requestId"],f"req{i}")
            self.assertFalse(r["executionAuthorized"] or r["externalTruthVerified"])
    def test_fail_closed_recovery(self):
        with self.assertRaises(ValueError):
            self.respond("alice","prove a",("INVALID",))
        self.assertEqual(self.respond("alice","prove a; execute").get("status"),"abstained")
        self.assertEqual(self.respond("alice","prove a",("a",))["status"],"resolved")
