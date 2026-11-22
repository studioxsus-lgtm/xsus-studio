import unittest
from dataclasses import replace
from core.intelligence.reasoning_v1 import Rule
from core.intelligence.problem_solver_v2 import ComplexProblemSolver

class ComplexSolverTests(unittest.TestCase):
    def setUp(self):
        self.solver=ComplexProblemSolver()
        self.facts=("a",)
        self.rules=(Rule(("a",),"b"),Rule(("b",),"c"),Rule(("b",),"d"))
    def solve(self,goals):
        return self.solver.solve(goals,self.facts,self.rules)
    def test_shared_dependencies(self):
        result=self.solve(("c","d"))
        self.assertEqual(result.status,"solved")
        self.assertEqual(len(result.steps),4)
        self.assertTrue(self.solver.evaluate(result,self.facts,self.rules))
    def test_partial(self):
        result=self.solve(("c","missing"))
        self.assertEqual(result.status,"partial")
        self.assertEqual(result.resolved,("c",))
        self.assertEqual(result.unresolved,("missing",))
    def test_unknown(self):
        self.assertEqual(self.solve(("missing",)).status,"unknown")
    def test_budget(self):
        result=ComplexProblemSolver(max_steps=2).solve(("c","d"),self.facts,self.rules)
        self.assertEqual(result.status,"resource_limit")
        self.assertEqual(result.steps,())
    def test_tampering(self):
        result=self.solve(("c","d"))
        for fake in (replace(result,executable=True),replace(result,steps=()),replace(result,resolved=("c",))):
            self.assertFalse(self.solver.evaluate(fake,self.facts,self.rules))
    def test_duplicate_goals(self):
        with self.assertRaises(ValueError):
            self.solve(("c","c"))
    def test_max_goals(self):
        goals=tuple(f"g{i}" for i in range(32))
        rules=tuple(Rule(("a",),g) for g in goals)
        result=self.solver.solve(goals,self.facts,rules)
        self.assertEqual(result.resolved,goals)
        self.assertEqual(len(result.steps),33)
    def test_deep_chain(self):
        rules=tuple(Rule((f"a{i}",),f"a{i+1}") for i in range(256))
        result=self.solver.solve(("a128","a256"),("a0",),rules)
        self.assertEqual(result.status,"solved")
        self.assertEqual(len(result.steps),257)
