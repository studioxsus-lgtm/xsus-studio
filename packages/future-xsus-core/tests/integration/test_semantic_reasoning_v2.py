import unittest
from dataclasses import replace
from core.intelligence.semantic_reasoning_v2 import ConceptRelation, SemanticReasoner
from core.intelligence.reasoning_v1 import verify_proof

class SemanticTests(unittest.TestCase):
    def setUp(self):
        self.engine=SemanticReasoner((ConceptRelation("car","automobile","equivalent"),ConceptRelation("automobile","vehicle","subtype"),ConceptRelation("vehicle","transport","subtype")))
    def test_chain(self):
        r=self.engine.infer(("car",),("automobile","transport"))
        self.assertTrue(all(x.entailed for x in r.results))
        self.assertTrue(all(verify_proof(x,("car",),r.compiled_rules) for x in r.results))
        self.assertEqual(r.relation_indices,(0,0,1,2))
        self.assertTrue(self.engine.verify(r,("car",),("automobile","transport")))
    def test_equivalence_reverse(self):
        self.assertTrue(self.engine.infer(("automobile",),("car",)).results[0].entailed)
    def test_subtype_not_reversible(self):
        self.assertFalse(self.engine.infer(("vehicle",),("car",)).results[0].entailed)
    def test_unknown(self):
        self.assertFalse(self.engine.infer((),("car",)).results[0].entailed)
    def test_tampering(self):
        r=self.engine.infer(("car",),("vehicle",))
        self.assertFalse(self.engine.verify(replace(r,external_truth_verified=True),("car",),("vehicle",)))
        self.assertFalse(self.engine.verify(replace(r,relation_indices=()),("car",),("vehicle",)))
    def test_invalid(self):
        for args in (("a","a","subtype"),("a","b","unrelated"),("INVALID","b","equivalent")):
            with self.assertRaises(ValueError):
                ConceptRelation(*args)
        relation=ConceptRelation("a","b","equivalent")
        with self.assertRaises(ValueError):
            SemanticReasoner((relation,relation))
    def test_budget(self):
        with self.assertRaises(ValueError):
            SemanticReasoner(tuple(ConceptRelation("a",f"b{i}","equivalent") for i in range(129)))
    def test_cycle_without_facts(self):
        engine=SemanticReasoner((ConceptRelation("a","b","equivalent"),))
        self.assertFalse(any(x.entailed for x in engine.infer((),("a","b")).results))
