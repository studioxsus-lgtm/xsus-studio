import unittest
from unittest.mock import patch
from core.intelligence.reasoning_v1 import Rule, verify_proof
from core.intelligence.reasoning_v2 import MultiStepReasoner
from core.intelligence.problem_solver_v2 import ComplexProblemSolver

class BatchTests(unittest.TestCase):
    def setUp(self):
        self.facts=("a0",)
        self.rules=tuple(Rule((f"a{i}",),f"a{i+1}") for i in range(256))
        self.goals=tuple(f"a{i}" for i in range(225,257))
    def test_single_closure(self):
        engine=MultiStepReasoner(self.facts,self.rules)
        with patch.object(engine,"_closure",wraps=engine._closure) as closure:
            results=engine.prove_many(self.goals)
            self.assertEqual(closure.call_count,1)
        self.assertEqual(len(results),32)
        self.assertTrue(all(verify_proof(r,self.facts,self.rules) for r in results))
    def test_parity(self):
        engine=MultiStepReasoner(self.facts,self.rules)
        queries=("a0","a128","missing","a256","a0")
        self.assertEqual(engine.prove_many(queries),tuple(engine.prove(q) for q in queries))
    def test_solver_uses_batch(self):
        original=MultiStepReasoner._closure
        calls=[]
        def counted(engine):
            calls.append(1)
            return original(engine)
        with patch.object(MultiStepReasoner,"_closure",counted):
            result=ComplexProblemSolver().solve(self.goals,self.facts,self.rules)
        self.assertEqual(len(calls),1)
        self.assertEqual(result.status,"solved")
        self.assertEqual(len(result.steps),257)
    def test_no_stale_cache(self):
        engine=MultiStepReasoner(("a",),(Rule(("a",),"b"),))
        self.assertTrue(engine.prove("b").entailed)
        engine.facts=()
        self.assertFalse(engine.prove("b").entailed)
    def test_bounds(self):
        engine=MultiStepReasoner((),())
        for queries in ((),["a"],("a",)*33,("INVALID",)):
            with self.assertRaises(ValueError):
                engine.prove_many(queries)
