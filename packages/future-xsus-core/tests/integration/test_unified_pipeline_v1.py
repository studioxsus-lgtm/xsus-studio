"""Unified intelligence routing, proof, planning, decisions, and batch safety."""
import unittest
from core.intelligence.unified_pipeline_v1 import (
    PipelineRequest, UnifiedIntelligencePipeline,
)
from core.intelligence.reasoning_v1 import Rule
from core.intelligence.task_planner_v1 import Task
from core.intelligence.decision_v1 import Criterion, Option
from core.intelligence.knowledge_v1 import Evidence, KnowledgeRecord, KnowledgeStore


class UnifiedPipelineTests(unittest.TestCase):
    def setUp(self):
        self.pipeline = UnifiedIntelligencePipeline()

    def test_reason(self):
        response = self.pipeline.run(PipelineRequest(
            "reason1", "reason", {"query": "ready", "facts": ("tested",),
                                    "rules": (Rule(("tested",), "ready"),)}))
        self.assertEqual(response.status, "resolved")
        self.assertTrue(response.verified)

    def test_problem_solver(self):
        response = self.pipeline.run(PipelineRequest(
            "problem1", "solve_problem",
            {"goal": "ready", "facts": ("tested",),
             "rules": (Rule(("tested",), "ready"),)}))
        self.assertEqual(response.status, "resolved")

    def test_plan(self):
        response = self.pipeline.run(PipelineRequest(
            "plan1", "plan_tasks",
            {"tasks": (Task("build", "Build"), Task("test", "Test", ("build",)))}))
        self.assertEqual(response.steps, ("build", "test"))
        self.assertEqual(response.status, "proposed")

    def test_decision(self):
        response = self.pipeline.run(PipelineRequest(
            "decision1", "decide",
            {"criteria": (Criterion("quality", 1),),
             "options": (Option("a", "A", (("quality", 90),)),)}))
        self.assertEqual(response.answer, "a")
        self.assertEqual(response.status, "proposed")

    def test_sourced_reasoning(self):
        store = KnowledgeStore((
            KnowledgeRecord("tested", "true",
                            Evidence.from_excerpt("report", "true"), "alice"),))
        response = self.pipeline.run(PipelineRequest(
            "grounded1", "infer_from_sources",
            {"store": store, "owner_id": "alice", "keys": ("tested",),
             "rules": (Rule(("tested",), "ready"),), "query": "ready"}))
        self.assertEqual(response.status, "resolved")
        self.assertIn("sources_not_independently_verified", response.limitations)

    def test_missing_evidence_abstains(self):
        response = self.pipeline.run(PipelineRequest(
            "reason2", "reason", {"query": "ready", "facts": (),
                                    "rules": (Rule(("tested",), "ready"),)}))
        self.assertEqual(response.status, "abstained")
        self.assertFalse(response.verified)

    def test_batch(self):
        requests = (
            PipelineRequest("a", "reason", {"query": "a", "facts": ("a",), "rules": ()}),
            PipelineRequest("b", "reason", {"query": "b", "facts": ("b",), "rules": ()}),
        )
        result = self.pipeline.run_batch(requests)
        self.assertEqual(tuple(r.request_id for r in result), ("a", "b"))

    def test_duplicate_batch_id_rejected(self):
        request = PipelineRequest("a", "reason",
                                  {"query": "a", "facts": ("a",), "rules": ()})
        with self.assertRaises(ValueError):
            self.pipeline.run_batch((request, request))

    def test_unknown_operation_rejected(self):
        with self.assertRaises(ValueError):
            PipelineRequest("a", "__class__", {})

    def test_unexpected_fields_rejected(self):
        with self.assertRaises(ValueError):
            self.pipeline.run(PipelineRequest(
                "a", "reason", {"query": "a", "facts": ("a",),
                                  "rules": (), "execute": True}))

    def test_missing_fields_rejected(self):
        with self.assertRaises(ValueError):
            self.pipeline.run(PipelineRequest("a", "reason", {"query": "a"}))


if __name__ == "__main__":
    unittest.main()
