import unittest
from dataclasses import replace
from core.intelligence.response_generation_v2 import generate_response
from core.intelligence.kernel_v2 import UnifiedIntelligenceKernel
from core.intelligence.knowledge_v1 import KnowledgeStore, KnowledgeRecord, Evidence
from core.intelligence.reasoning_v1 import Rule
from core.intelligence.task_planner_v1 import Task
from core.intelligence.adaptive_learning_v2 import LearningCase

class GenerationTests(unittest.TestCase):
    def setUp(self):
        self.kernel=UnifiedIntelligenceKernel(KnowledgeStore((KnowledgeRecord("a","true",Evidence.from_excerpt("source","a"),"alice"),)))
        self.rules=(Rule(("a",),"b"),)
    def run_op(self,op,**payload):
        r=generate_response(self.kernel.run("alice","req",op,payload))
        self.assertFalse(r.external_truth_verified or r.execution_authorized)
        self.assertEqual(r.request_id,"req")
        return r
    def test_reason(self):
        r=self.run_op("reason",queries=("b","c"),facts=("a",),rules=self.rules)
        self.assertEqual(r.status,"partial")
        self.assertIn("does not establish falsity",r.text)
    def test_solve(self):
        r=self.run_op("solve",goals=("b","c"),facts=("a",),rules=self.rules)
        self.assertEqual(r.status,"partial")
        self.assertIn("Unresolved goals: c",r.text)
    def test_infer(self):
        r=self.run_op("infer",query="b",rules=self.rules)
        self.assertEqual(r.status,"resolved")
        self.assertIn("Evidence references: 1",r.text)
    def test_coordinate(self):
        r=self.run_op("coordinate",goals=("b",),rules=self.rules,tasks=(Task("review","Review"),))
        self.assertEqual(r.status,"proposed")
        self.assertIn("No tasks executed",r.text)
    def test_search(self):
        r=self.run_op("search",query="b",facts=("a",),rules=self.rules)
        self.assertEqual(r.status,"resolved")
        self.assertIn("1 alternative proofs",r.text)
    def test_learning(self):
        r=self.run_op("evaluate_candidate",baseline=(),candidate=self.rules,development=(LearningCase(("a",),"b",True),),holdout=(LearningCase((),"b",False),))
        self.assertEqual(r.status,"proposed")
        self.assertIn("No candidate promoted",r.text)
    def test_abstention(self):
        self.assertEqual(self.run_op("reason",queries=("b",),facts=(),rules=()).status,"abstained")
    def test_invalid(self):
        r=self.kernel.run("alice","req","reason",dict(queries=("a",),facts=("a",),rules=()))
        for bad in (replace(r,execution_authorized=True),replace(r,version="1.0.0"),replace(r,operation="execute")):
            with self.assertRaises(ValueError):
                generate_response(bad)
