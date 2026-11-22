import unittest
from core.intelligence.kernel_v2 import UnifiedIntelligenceKernel
from core.intelligence.knowledge_v1 import KnowledgeStore, KnowledgeRecord, Evidence
from core.intelligence.reasoning_v1 import Rule
from core.intelligence.task_planner_v1 import Task
from core.intelligence.adaptive_learning_v2 import LearningCase

class KernelV2Tests(unittest.TestCase):
    def setUp(self):
        self.kernel=UnifiedIntelligenceKernel(KnowledgeStore((KnowledgeRecord("a","true",Evidence.from_excerpt("source","a"),"alice"),)))
        self.rules=(Rule(("a",),"b"),)
    def run_op(self,op,payload,owner="alice"):
        response=self.kernel.run(owner,"request_1",op,payload)
        self.assertEqual(response.version,"2.0.0")
        self.assertEqual(response.request_id,"request_1")
        self.assertFalse(response.execution_authorized)
        return response.result
    def test_reason(self):
        r=self.run_op("reason",dict(queries=("b","c"),facts=("a",),rules=self.rules))
        self.assertEqual(tuple(x.entailed for x in r),(True,False))
    def test_solve(self):
        self.assertEqual(self.run_op("solve",dict(goals=("b",),facts=("a",),rules=self.rules)).status,"solved")
    def test_infer_isolation(self):
        p=dict(query="b",rules=self.rules)
        self.assertEqual(self.run_op("infer",p).status,"supported")
        self.assertEqual(self.run_op("infer",p,"bob").status,"unknown")
    def test_coordinate(self):
        self.assertEqual(self.run_op("coordinate",dict(goals=("b",),rules=self.rules,tasks=(Task("review","Review"),))).status,"proposed")
    def test_search(self):
        self.assertEqual(self.run_op("search",dict(query="b",facts=("a",),rules=self.rules)).status,"supported")
    def test_learning(self):
        r=self.run_op("evaluate_candidate",dict(baseline=(),candidate=self.rules,development=(LearningCase(("a",),"b",True),),holdout=(LearningCase((),"b",False),)))
        self.assertFalse(r["promotion_authorized"])
        self.assertEqual(r["status"],"eligible_for_manual_review")
    def test_reject_invalid(self):
        for op,p in (("execute",{}),("infer",{"query":"b"}),("infer",dict(query="b",rules=self.rules,owner_id="bob"))):
            with self.assertRaises(ValueError):
                self.kernel.run("alice","request_1",op,p)
