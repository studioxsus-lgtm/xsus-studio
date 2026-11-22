import unittest
from dataclasses import replace
from core.intelligence.multi_engine_v1 import MultiEngineCoordinator
from core.intelligence.kernel_v1 import IntelligenceKernel
from core.intelligence.reasoning_v1 import Rule
from core.intelligence.task_planner_v1 import Task


class DisagreeingKernel(IntelligenceKernel):
    def solve_problem(self, *args, **kwargs):
        return replace(super().solve_problem(*args, **kwargs), answer="other")


class CoordinationTests(unittest.TestCase):
    def setUp(self):
        self.coordinator = MultiEngineCoordinator()
        self.facts = ("start",)
        self.rules = (Rule(("start",), "middle"), Rule(("middle",), "done"))
        self.tasks = (Task("build", "Build"), Task("test", "Test", ("build",)))

    def test_verified_proposal(self):
        result = self.coordinator.propose("done", self.facts, self.rules, self.tasks)
        self.assertEqual((result.status, result.ordered_tasks, result.verified),
                         ("proposed", ("build", "test"), True))

    def test_unknown_goal(self):
        self.assertEqual(self.coordinator.propose("missing", self.facts, self.rules,
                                                  self.tasks).status, "abstained")

    def test_budget(self):
        result = self.coordinator.propose("done", self.facts, self.rules,
                                          self.tasks, max_steps=1)
        self.assertFalse(result.verified)

    def test_cycle(self):
        tasks = (Task("a", "A", ("b",)), Task("b", "B", ("a",)))
        self.assertEqual(self.coordinator.propose("done", self.facts, self.rules,
                                                  tasks).status, "abstained")

    def test_disagreement(self):
        result = MultiEngineCoordinator(DisagreeingKernel()).propose(
            "done", self.facts, self.rules, self.tasks)
        self.assertEqual(result.status, "verification_failed")
        self.assertEqual(result.ordered_tasks, ())

    def test_limitations(self):
        result = self.coordinator.propose("done", self.facts, self.rules, self.tasks)
        self.assertIn("no_execution", result.limitations)
        self.assertIn("plan_goal_relationship_not_verified", result.limitations)

    def test_repeatability(self):
        args = ("done", self.facts, self.rules, self.tasks)
        self.assertEqual(self.coordinator.propose(*args), self.coordinator.propose(*args))

    def test_invalid_goal(self):
        with self.assertRaises(ValueError):
            self.coordinator.propose("INVALID", self.facts, self.rules, self.tasks)
