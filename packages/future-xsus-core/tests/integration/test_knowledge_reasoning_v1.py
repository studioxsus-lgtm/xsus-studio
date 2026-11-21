"""Knowledge integrity, tenant isolation, conflict, and reasoning integration."""
import unittest
from dataclasses import replace
from core.intelligence.knowledge_v1 import Evidence, KnowledgeRecord, KnowledgeStore
from core.intelligence.knowledge_reasoning_v1 import infer_from_knowledge
from core.intelligence.reasoning_v1 import Rule


def record(owner, key, value, source):
    return KnowledgeRecord(key, value, Evidence.from_excerpt(source, value), owner)


class KnowledgeReasoningTests(unittest.TestCase):
    def test_source_digest(self):
        evidence = Evidence.from_excerpt("doc1", "hello")
        self.assertTrue(evidence.valid())
        self.assertFalse(replace(evidence, excerpt="tampered").valid())

    def test_invalid_evidence_rejected(self):
        with self.assertRaises(ValueError):
            KnowledgeRecord("ready", "true",
                            replace(Evidence.from_excerpt("doc1", "true"),
                                    excerpt="false"), "alice")

    def test_owner_isolation(self):
        store = KnowledgeStore((record("alice", "ready", "true", "a1"),))
        self.assertEqual(store.query("alice", "ready").status, "supported")
        self.assertEqual(store.query("bob", "ready").status, "unknown")
        self.assertEqual(store.records_for_owner("bob"), ())

    def test_conflict_detected(self):
        store = KnowledgeStore((record("alice", "ready", "true", "a1"),
                                record("alice", "ready", "false", "a2")))
        result = store.query("alice", "ready")
        self.assertEqual(result.status, "conflict")
        self.assertIsNone(result.value)

    def test_supported_not_truth_verified(self):
        store = KnowledgeStore((record("alice", "ready", "true", "a1"),))
        result = store.query("alice", "ready")
        self.assertFalse(result.verified)
        self.assertIn("a1", result.sources)

    def test_grounded_inference(self):
        store = KnowledgeStore((record("alice", "tested", "true", "test_report"),
                                record("alice", "approved", "true", "approval")))
        result = infer_from_knowledge(
            store, "alice", ("tested", "approved"),
            (Rule(("tested", "approved"), "release_ready"),), "release_ready")
        self.assertEqual(result.status, "entailed")
        self.assertTrue(result.verified_derivation)
        self.assertFalse(result.verified_external_truth)
        self.assertEqual(result.sources, ("approval", "test_report"))

    def test_grounded_inference_denies_cross_owner(self):
        store = KnowledgeStore((record("alice", "tested", "true", "test_report"),))
        result = infer_from_knowledge(
            store, "bob", ("tested",), (Rule(("tested",), "ready"),), "ready")
        self.assertEqual(result.status, "unknown")

    def test_conflict_blocks_inference(self):
        store = KnowledgeStore((record("alice", "tested", "true", "one"),
                                record("alice", "tested", "false", "two")))
        result = infer_from_knowledge(
            store, "alice", ("tested",), (Rule(("tested",), "ready"),), "ready")
        self.assertEqual(result.status, "conflict")
        self.assertFalse(result.verified_derivation)

    def test_false_claim_not_used_as_true(self):
        store = KnowledgeStore((record("alice", "tested", "false", "one"),))
        result = infer_from_knowledge(
            store, "alice", ("tested",), (Rule(("tested",), "ready"),), "ready")
        self.assertEqual(result.status, "abstained")

    def test_unknown_proposition_abstains(self):
        store = KnowledgeStore((record("alice", "tested", "true", "one"),))
        result = infer_from_knowledge(
            store, "alice", ("tested",), (Rule(("approved",), "ready"),), "ready")
        self.assertEqual(result.status, "unknown")

    def test_immutable_add(self):
        store = KnowledgeStore()
        added = store.add(record("alice", "ready", "true", "doc"))
        self.assertEqual(store.query("alice", "ready").status, "unknown")
        self.assertEqual(added.query("alice", "ready").status, "supported")


if __name__ == "__main__":
    unittest.main()
