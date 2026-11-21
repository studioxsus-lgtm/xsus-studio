"""Multi-step planning, verification, tampering and fail-closed regression."""
import unittest
from dataclasses import replace
from core.intelligence.problem_solver_v1 import ProblemSolver
from core.intelligence.reasoning_v1 import Rule, ProofStep


class ProblemSolverTests(unittest.TestCase):
    def setUp(self):
        self.facts = ("request_received", "identity_checked", "tests_passed")
        self.rules = (
            Rule(("request_received", "identity_checked"), "request_validated"),
            Rule(("request_validated", "tests_passed"), "review_ready"),
            Rule(("review_ready",), "release_candidate"),
        )
        self.solver = ProblemSolver()

    def test_multistep_solution(self):
        result = self.solver.solve("release_candidate", self.facts, self.rules)
        self.assertEqual(result.status, "solved")
        self.assertTrue(result.verified_derivation)
        self.assertFalse(result.executable)
        self.assertTrue(self.solver.evaluate(result, self.facts, self.rules))
        self.assertEqual(result.steps[-1].conclusion, "release_candidate")

    def test_missing_fact_abstains(self):
        result = self.solver.solve("release_candidate", ("request_received",), self.rules)
        self.assertEqual(result.status, "unknown")
        self.assertFalse(result.verified_derivation)

    def test_budget_limits(self):
        result = ProblemSolver(max_steps=2).solve("release_candidate", self.facts, self.rules)
        self.assertEqual(result.status, "resource_limit")
        self.assertFalse(result.executable)

    def test_tampering_detected(self):
        result = self.solver.solve("release_candidate", self.facts, self.rules)
        forged = replace(result, steps=(ProofStep("release_candidate", (), None),))
        self.assertFalse(self.solver.evaluate(forged, self.facts, self.rules))

    def test_modified_rules_detected(self):
        result = self.solver.solve("release_candidate", self.facts, self.rules)
        self.assertFalse(self.solver.evaluate(result, self.facts, self.rules[:-1]))

    def test_modified_facts_detected(self):
        result = self.solver.solve("release_candidate", self.facts, self.rules)
        self.assertFalse(self.solver.evaluate(result, ("request_received",), self.rules))

    def test_fact_only_goal(self):
        result = self.solver.solve("tests_passed", self.facts, self.rules)
        self.assertEqual(result.status, "solved")
        self.assertTrue(self.solver.evaluate(result, self.facts, self.rules))

    def test_cycle_terminates(self):
        result = self.solver.solve("b", ("a",),
                                   (Rule(("a",), "b"), Rule(("b",), "a")))
        self.assertEqual(result.status, "solved")

    def test_invalid_budget(self):
        with self.assertRaises(ValueError):
            ProblemSolver(max_steps=0)


if __name__ == "__main__":
    unittest.main()
