import unittest
from dataclasses import replace
from core.intelligence.knowledge_v1 import KnowledgeStore, KnowledgeRecord, Evidence
from core.intelligence.reasoning_v1 import Rule
from core.intelligence.task_planner_v1 import Task
from core.intelligence.multi_engine_v2 import AdvancedCoordinator

class CoordinationTests(unittest.TestCase):
    def setUp(self):
        self.coordinator=AdvancedCoordinator(KnowledgeStore((KnowledgeRecord("a","true",Evidence.from_excerpt("source","a"),"alice"),)))
        self.rules=(Rule(("a",),"b"),Rule(("b",),"c"))
        self.tasks=(Task("second","Review",("first",)),Task("first","Prepare"))
    def propose(self,goals=("b","c"),owner="alice",tasks=None):
        return self.coordinator.propose(owner,goals,self.rules,self.tasks if tasks is None else tasks)
    def test_success(self):
        r=self.propose()
        self.assertEqual(r.status,"proposed")
        self.assertEqual(r.ordered_tasks,("first","second"))
        self.assertFalse(r.execution_authorized)
        self.assertTrue(self.coordinator.evaluate(r,"alice",self.rules,self.tasks))
    def test_partial(self):
        r=self.propose(("b","unknown"))
        self.assertEqual(r.status,"abstained")
        self.assertEqual(r.ordered_tasks,())
    def test_owner(self):
        self.assertEqual(self.propose(owner="bob").status,"abstained")
    def test_cycle(self):
        r=self.propose(tasks=(Task("x","X",("y",)),Task("y","Y",("x",))))
        self.assertEqual(r.status,"plan_blocked")
    def test_tampering(self):
        r=self.propose()
        for fake in (replace(r,execution_authorized=True),replace(r,ordered_tasks=("second","first"))):
            self.assertFalse(self.coordinator.evaluate(fake,"alice",self.rules,self.tasks))
    def test_duplicate(self):
        with self.assertRaises(ValueError):
            self.propose(("b","b"))
