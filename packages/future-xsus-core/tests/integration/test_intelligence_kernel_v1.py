"""End-to-end bounded orchestration and safety regression."""
import unittest
from core.intelligence.kernel_v1 import IntelligenceKernel, BoundedConversation
from core.intelligence.english_adapter_v1 import create_english_kernel


class IntelligenceKernelTests(unittest.TestCase):
    def test_english_grammar_integration(self):
        result = create_english_kernel().analyze("She has reviewed the report.")
        self.assertEqual((result.status, result.task, result.answer),
                         ("resolved", "language", "perfect"))
        self.assertTrue(result.verified)

    def test_english_question_integration(self):
        result = create_english_kernel().analyze("What does she review the report?")
        self.assertEqual(result.answer, "wh_question_what")

    def test_unrecognized_input_abstains(self):
        result = create_english_kernel().analyze("An entirely unknown hypothetical universe.")
        self.assertEqual(result.status, "abstained")

    def test_missing_adapters_fail_closed(self):
        self.assertEqual(IntelligenceKernel().analyze("hello").status, "abstained")
        self.assertEqual(IntelligenceKernel().retrieve("hello").status, "abstained")

    def test_knowledge_requires_source(self):
        kernel = IntelligenceKernel(knowledge=lambda _: {"answer": "42"})
        self.assertEqual(kernel.retrieve("question").status, "abstained")

    def test_knowledge_source_does_not_prove_truth(self):
        kernel = IntelligenceKernel(knowledge=lambda _: {"answer": "42", "source": "record-1"})
        result = kernel.retrieve("question")
        self.assertEqual(result.status, "resolved")
        self.assertFalse(result.verified)

    def test_verified_reasoning_integration(self):
        from core.intelligence.reasoning_v1 import Rule
        result = IntelligenceKernel().reason(
            "release_ready", ("tested", "approved"),
            (Rule(("tested", "approved"), "release_ready"),))
        self.assertEqual((result.status, result.answer, result.verified),
                         ("resolved", "release_ready", True))

    def test_missing_reasoning_evidence_abstains(self):
        from core.intelligence.reasoning_v1 import Rule
        result = IntelligenceKernel().reason(
            "release_ready", ("tested",),
            (Rule(("tested", "approved"), "release_ready"),))
        self.assertEqual(result.status, "abstained")

    def test_sourced_reasoning_integration(self):
        from core.intelligence.reasoning_v1 import Rule
        from core.intelligence.knowledge_v1 import Evidence, KnowledgeRecord, KnowledgeStore
        store = KnowledgeStore((
            KnowledgeRecord("tested", "true", Evidence.from_excerpt("report", "true"), "owner"),
            KnowledgeRecord("approved", "true", Evidence.from_excerpt("review", "true"), "owner"),
        ))
        result = IntelligenceKernel().infer_from_sources(
            store, "owner", ("tested", "approved"),
            (Rule(("tested", "approved"), "ready"),), "ready")
        self.assertEqual(result.status, "resolved")
        self.assertEqual(result.evidence, ("report", "review"))
        self.assertIn("sources_not_independently_verified", result.limitations)

    def test_verified_problem_solver_integration(self):
        from core.intelligence.reasoning_v1 import Rule
        result = IntelligenceKernel().solve_problem(
            "ready", ("tested", "approved"),
            (Rule(("tested", "approved"), "ready"),))
        self.assertEqual((result.status, result.answer, result.verified),
                         ("resolved", "ready", True))
        self.assertIn("no_tool_execution", result.limitations)

    def test_unsolved_problem_abstains(self):
        from core.intelligence.reasoning_v1 import Rule
        result = IntelligenceKernel().solve_problem(
            "ready", ("tested",), (Rule(("tested", "approved"), "ready"),))
        self.assertEqual(result.status, "abstained")

    def test_dependency_planning_integration(self):
        from core.intelligence.task_planner_v1 import Task
        result = IntelligenceKernel().plan_tasks((
            Task("build", "Build"),
            Task("test", "Test", ("build",)),
        ))
        self.assertEqual(result.status, "proposed")
        self.assertEqual(result.steps, ("build", "test"))
        self.assertTrue(result.verified)
        self.assertIn("plan_not_executed", result.limitations)

    def test_planning_is_not_execution(self):
        kernel = IntelligenceKernel()
        plan = kernel.plan("build a system", ("design", "test", "review"))
        self.assertEqual(plan.status, "proposed")
        self.assertEqual(kernel.execute(plan).status, "denied")

    def test_learning_is_review_gated(self):
        result = IntelligenceKernel().propose_learning("bad output", "correct output")
        self.assertEqual(result["status"], "review_required")
        self.assertFalse(result["model_changed"])
        self.assertFalse(result["knowledge_committed"])

    def test_learning_deterministic_id(self):
        kernel = IntelligenceKernel()
        self.assertEqual(kernel.propose_learning("a", "b")["proposal_id"],
                         kernel.propose_learning("a", "b")["proposal_id"])

    def test_conversation_bounded_and_clearable(self):
        history = BoundedConversation()
        for i in range(20):
            history.add("user", f"turn {i}")
        self.assertEqual(len(history.history()), 16)
        history.clear()
        self.assertEqual(history.history(), ())

    def test_rejects_unsafe_inputs(self):
        kernel = IntelligenceKernel()
        with self.assertRaises(ValueError):
            kernel.plan("goal", tuple(str(i) for i in range(9)))
        with self.assertRaises(ValueError):
            kernel.analyze(" ")


if __name__ == "__main__":
    unittest.main()
