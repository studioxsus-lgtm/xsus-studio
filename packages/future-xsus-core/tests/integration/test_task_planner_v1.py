"""Dependency planning, cycles, invalid progress and independent verification."""
import unittest
from dataclasses import replace
from core.intelligence.task_planner_v1 import Task, TaskPlanner


class TaskPlannerTests(unittest.TestCase):
    def setUp(self):
        self.planner = TaskPlanner()
        self.tasks = (
            Task("design", "Design architecture"),
            Task("implement", "Implement code", ("design",)),
            Task("test", "Run tests", ("implement",)),
            Task("review", "Review results", ("test",)),
        )

    def test_ordered_dependencies(self):
        plan = self.planner.build(self.tasks)
        self.assertEqual(plan.ordered_ids, ("design", "implement", "test", "review"))
        self.assertTrue(self.planner.verify(plan))

    def test_ready_and_blocked(self):
        plan = self.planner.build(self.tasks)
        result = self.planner.progress(plan, ())
        self.assertEqual(result.ready_ids, ("design",))
        self.assertEqual(result.blocked_ids, ("implement", "test", "review"))

    def test_progress_and_completion(self):
        plan = self.planner.build(self.tasks)
        result = self.planner.progress(plan, ("design", "implement"))
        self.assertEqual(result.ready_ids, ("test",))
        self.assertEqual(result.blocked_ids, ("review",))
        completed = self.planner.progress(plan, plan.ordered_ids)
        self.assertEqual(completed.status, "complete")
        self.assertTrue(completed.verified)

    def test_invalid_completion_rejected(self):
        plan = self.planner.build(self.tasks)
        with self.assertRaises(ValueError):
            self.planner.progress(plan, ("test",))

    def test_cycle_detected(self):
        result = self.planner.build((Task("a", "A", ("b",)),
                                     Task("b", "B", ("a",))))
        self.assertEqual(result.status, "cycle")
        self.assertFalse(self.planner.verify(result))

    def test_missing_dependency_rejected(self):
        with self.assertRaises(ValueError):
            self.planner.build((Task("a", "A", ("missing",)),))

    def test_duplicate_task_rejected(self):
        with self.assertRaises(ValueError):
            self.planner.build((Task("a", "A"), Task("a", "B")))

    def test_tampered_order_rejected(self):
        plan = self.planner.build(self.tasks)
        forged = replace(plan, ordered_ids=tuple(reversed(plan.ordered_ids)))
        self.assertFalse(self.planner.verify(forged))

    def test_deterministic_independent_tasks(self):
        plan = self.planner.build((Task("z", "Z"), Task("a", "A")))
        self.assertEqual(plan.ordered_ids, ("a", "z"))

    def test_self_dependency_rejected(self):
        with self.assertRaises(ValueError):
            Task("a", "A", ("a",))


if __name__ == "__main__":
    unittest.main()
