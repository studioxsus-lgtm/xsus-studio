import unittest
from dataclasses import replace
from core.intelligence.knowledge_acquisition_v2 import KnowledgeAcquisition
from core.intelligence.knowledge_v1 import KnowledgeStore, KnowledgeRecord, Evidence

def record(key="a",value="true",source="source",owner="alice"):
    return KnowledgeRecord(key,value,Evidence.from_excerpt(source,value),owner)

class AcquisitionTests(unittest.TestCase):
    def setUp(self):
        self.original=record()
        self.store=KnowledgeStore((self.original,))
        self.engine=KnowledgeAcquisition(self.store)
    def test_new(self):
        p=self.engine.propose("alice",record(key="b"))
        self.assertEqual(p.status,"new_knowledge_review_required")
        self.assertFalse(p.persistence_authorized or p.external_truth_verified)
        self.assertTrue(self.engine.verify("alice",p))
        self.assertEqual(self.store.query("alice","b").status,"unknown")
    def test_duplicate(self):
        self.assertEqual(self.engine.propose("alice",self.original).status,"duplicate")
    def test_additional_evidence(self):
        self.assertEqual(self.engine.propose("alice",record(source="other")).status,"additional_evidence_review_required")
    def test_conflict(self):
        self.assertEqual(self.engine.propose("alice",record(value="false")).status,"conflict_review_required")
    def test_owner(self):
        with self.assertRaises(PermissionError):
            self.engine.propose("bob",self.original)
        self.assertEqual(self.engine.propose("bob",record(owner="bob")).status,"new_knowledge_review_required")
    def test_tampering_and_staleness(self):
        p=self.engine.propose("alice",record(key="b"))
        self.assertFalse(self.engine.verify("alice",replace(p,persistence_authorized=True)))
        self.assertFalse(KnowledgeAcquisition(self.store.add(record(key="b"))).verify("alice",p))
        self.assertFalse(self.engine.verify("bob",p))
    def test_batch(self):
        self.assertEqual(len(self.engine.propose_batch("alice",(record(),record(key="b")))),2)
        for rows in ((),(record(),record(value="false")),tuple(record(key=f"k{i}") for i in range(65))):
            with self.assertRaises(ValueError):
                self.engine.propose_batch("alice",rows)
    def test_noncanonical(self):
        with self.assertRaises(ValueError):
            self.engine.propose("alice",record(value=" true "))
