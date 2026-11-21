"""Offline autonomous problem evaluation safety and correctness checks."""
import unittest
from core.intelligence.problem_evaluation_v1 import (
    AutonomousProblemEvaluation, ProblemEvaluationCase, PlanningEvaluationCase)
from core.intelligence.reasoning_v1 import Rule
from core.intelligence.task_planner_v1 import Task


class ProblemEvaluationTests(unittest.TestCase):
    def setUp(self):
        self.engine = AutonomousProblemEvaluation()
        self.cases = (
            ProblemEvaluationCase("multi_step", "done", ("start",), (
                Rule(("start",), "middle"), Rule(("middle",), "done")), True),
            ProblemEvaluationCase("missing_fact", "done", (), (
                Rule(("start",), "done"),), False),
            ProblemEvaluationCase("unsupported_cycle", "done", (), (
                Rule(("done",), "start"), Rule(("start",), "done")), False),
            ProblemEvaluationCase("budget_exhausted", "done", ("start",), (
                Rule(("start",), "middle"), Rule(("middle",), "done")), False, 2),
            PlanningEvaluationCase("dependency_plan", (
                Task("design", "Design"),
                Task("build", "Build", ("design",)),
                Task("test", "Test", ("build",))), True),
            PlanningEvaluationCase("dependency_cycle", (
                Task("first", "First", ("second",)),
                Task("second", "Second", ("first",))), False),
        )

    def test_all_six_cases(self):
        report = self.engine.evaluate(self.cases)
        self.assertEqual((report.status, report.passed, report.total),
                         ("pass", 6, 6))

    def test_proof_replay(self):
        report = self.engine.evaluate(self.cases)
        self.assertTrue(report.outcomes[0].verified)

    def test_missing_facts_abstain(self):
        report = self.engine.evaluate(self.cases)
        self.assertEqual(report.outcomes[1].observed_status, "unknown")

    def test_cycle_does_not_invent_solution(self):
        report = self.engine.evaluate(self.cases)
        self.assertFalse(report.outcomes[2].verified)

    def test_step_budget_enforced(self):
        report = self.engine.evaluate(self.cases)
        self.assertEqual(report.outcomes[3].observed_status, "resource_limit")

    def test_planning_cycle(self):
        report = self.engine.evaluate(self.cases)
        self.assertEqual(report.outcomes[5].observed_status, "cycle")

    def test_incorrect_expectation_fails(self):
        wrong = ProblemEvaluationCase("wrong", "done", ("start",),
                                      (Rule(("start",), "done"),), False)
        self.assertEqual(self.engine.evaluate((wrong,)).status, "fail")

    def test_duplicate_case_ids_rejected(self):
        with self.assertRaises(ValueError):
            self.engine.evaluate(self.cases + (self.cases[0],))

    def test_execution_is_not_enabled(self):
        report = self.engine.evaluate(self.cases)
        self.assertIn("no_autonomous_tool_execution", report.limitations)


if __name__ == "__main__":
    unittest.main()
