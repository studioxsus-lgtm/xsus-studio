import unittest
from core.intelligence.knowledge_v1 import KnowledgeStore, KnowledgeRecord, Evidence
from core.intelligence.knowledge_v2 import EvidenceReasoner
from core.intelligence.reasoning_v1 import Rule, ReasoningResult, verify_proof

def row(key,value,owner="alice"):
    return KnowledgeRecord(key,value,Evidence.from_excerpt("source",key+" "+value),owner)

class EvidenceTests(unittest.TestCase):
    def infer(self,rows,query,rules=()):
        return EvidenceReasoner(KnowledgeStore(tuple(rows))).infer("alice",query,rules)
    def test_chain(self):
        r=self.infer([row("a","true")],"c",(Rule(("a",),"b"),Rule(("b",),"c")))
        self.assertTrue(r.verified_derivation)
        self.assertFalse(r.external_truth_verified)
        self.assertEqual(r.sources[0][:2],("a","source"))
    def test_conflict(self):
        r=self.infer([row("a","true"),row("a","false")],"a")
        self.assertEqual(r.status,"conflict")
    def test_no_conflict_bypass(self):
        r=self.infer([row("a","true"),row("b","false")],"c",(Rule(("a",),"b"),Rule(("b",),"c")))
        self.assertEqual(r.status,"unknown")
    def test_owner(self):
        self.assertEqual(self.infer([row("a","true","bob")],"a").status,"unknown")
    def test_original_rule_index(self):
        rules=(Rule(("a",),"blocked"),Rule(("a",),"b"))
        r=self.infer([row("a","true"),row("blocked","false")],"b",rules)
        self.assertTrue(verify_proof(ReasoningResult("entailed","b",True,r.proof,0,0,()),("a",),rules))
    def test_nonformal(self):
        self.assertEqual(self.infer([row("non-formal","true"),row("a","description")],"a").status,"unknown")
