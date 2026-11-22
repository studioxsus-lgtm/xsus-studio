import random
import unittest
from core.intelligence.reasoning_v1 import Rule, verify_proof
from core.intelligence.reasoning_v2 import MultiStepReasoner

class MultiStepTests(unittest.TestCase):
    def test_max_chain(self):
        facts=("a0",)
        rules=tuple(Rule((f"a{i}",),f"a{i+1}") for i in range(256))
        result=MultiStepReasoner(facts,rules).prove("a256")
        self.assertEqual(result.rounds,256)
        self.assertEqual(len(result.proof),257)
        self.assertTrue(verify_proof(result,facts,rules))

    def test_unseeded_cycle(self):
        rules=(Rule(("b",),"a"),Rule(("a",),"b"))
        self.assertEqual(MultiStepReasoner((),rules).prove("a").status,"unknown")

    def test_conjunction(self):
        rules=(Rule(("a","b"),"c"),)
        self.assertFalse(MultiStepReasoner(("a",),rules).prove("c").entailed)
        self.assertTrue(MultiStepReasoner(("a","b"),rules).prove("c").entailed)

    def test_fact_query(self):
        self.assertTrue(MultiStepReasoner(("a",),()).prove("a").entailed)

    def test_generated_graphs(self):
        rng=random.Random(102)
        atoms=[f"a{i}" for i in range(32)]
        for _ in range(100):
            facts=tuple(rng.sample(atoms,5))
            rules=tuple(Rule(tuple(rng.sample(atoms,rng.randint(1,3))),rng.choice(atoms)) for _ in range(80))
            closure=set(facts)
            while True:
                next_set=closure | {r.conclusion for r in rules if set(r.premises)<=closure}
                if next_set==closure:
                    break
                closure=next_set
            engine=MultiStepReasoner(facts,rules)
            for query in atoms:
                result=engine.prove(query)
                self.assertEqual(result.entailed,query in closure)
                if result.entailed:
                    self.assertTrue(verify_proof(result,facts,rules))
