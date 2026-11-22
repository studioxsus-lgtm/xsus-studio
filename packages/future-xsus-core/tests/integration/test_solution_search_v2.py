import unittest
from dataclasses import replace
from core.intelligence.reasoning_v1 import Rule, ReasoningResult, verify_proof
from core.intelligence.solution_search_v2 import search_solutions, verify_search

class SearchTests(unittest.TestCase):
    def setUp(self):
        self.facts=("a",)
        self.rules=(Rule(("a",),"b"),Rule(("b",),"goal"),Rule(("a",),"goal"))
    def test_alternatives(self):
        r=search_solutions("goal",self.facts,self.rules)
        self.assertEqual(len(r.alternatives),2)
        self.assertEqual([len(p) for p in r.alternatives],[2,3])
        self.assertTrue(r.search_complete)
        for p in r.alternatives:
            self.assertTrue(verify_proof(ReasoningResult("entailed","goal",True,p,0,0,()),self.facts,self.rules))
    def test_budget(self):
        r=search_solutions("goal",self.facts,self.rules,budget=1)
        self.assertFalse(r.search_complete)
        self.assertEqual(r.examined,1)
    def test_unknown(self):
        self.assertEqual(search_solutions("missing",self.facts,self.rules).status,"unknown")
    def test_fact(self):
        r=search_solutions("a",self.facts,self.rules)
        self.assertTrue(r.search_complete)
        self.assertEqual(len(r.alternatives),1)
    def test_replay(self):
        r=search_solutions("goal",self.facts,self.rules)
        self.assertTrue(verify_search(r,self.facts,self.rules))
        self.assertFalse(verify_search(replace(r,execution_authorized=True),self.facts,self.rules))
        self.assertFalse(verify_search(replace(r,alternatives=()),self.facts,self.rules))
    def test_invalid_budget(self):
        for value in (True,0,257):
            with self.assertRaises(ValueError):
                search_solutions("goal",self.facts,self.rules,budget=value)
