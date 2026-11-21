"""Evaluation accuracy, abstention, deterministic failure and regression tests."""
import unittest
from dataclasses import replace
from core.intelligence.evaluation_v1 import EvaluationCase, IntelligenceEvaluator
from core.intelligence.unified_pipeline_v1 import PipelineRequest
from core.intelligence.reasoning_v1 import Rule
from core.intelligence.task_planner_v1 import Task
from core.intelligence.decision_v1 import Criterion, Option


class EvaluationTests(unittest.TestCase):
    def setUp(self):
        self.evaluator = IntelligenceEvaluator()
        self.cases = (
            EvaluationCase("reason_success",
                           PipelineRequest("r1", "reason",
                                           {"query": "ready", "facts": ("tested",),
                                            "rules": (Rule(("tested",), "ready"),)}),
                           "resolved", "ready", True),
            EvaluationCase("reason_abstain",
                           PipelineRequest("r2", "reason",
                                           {"query": "ready", "facts": (),
                                            "rules": (Rule(("tested",), "ready"),)}),
                           "abstained", None, False),
            EvaluationCase("plan",
                           PipelineRequest("r3", "plan_tasks",
                                           {"tasks": (Task("build", "Build"),)}),
                           "proposed", None, True),
            EvaluationCase("decision",
                           PipelineRequest("r4", "decide",
                                           {"criteria": (Criterion("quality", 1),),
                                            "options": (Option("a", "A", (("quality", 90),)),)}),
                           "proposed", "a", True),
        )

    def test_cross_engine_pass(self):
        report = self.evaluator.evaluate(self.cases)
        self.assertEqual(report.status, "pass")
        self.assertEqual(report.passed, 4)

    def test_expected_answer_mismatch_detected(self):
        bad = replace(self.cases[0], expected_answer="wrong")
        report = self.evaluator.evaluate((bad,))
        self.assertEqual(report.status, "fail")
        self.assertIn("answer_mismatch", report.outcomes[0].failure_reasons)

    def test_verification_mismatch_detected(self):
        bad = replace(self.cases[0], expected_verified=False)
        report = self.evaluator.evaluate((bad,))
        self.assertIn("verification_mismatch", report.outcomes[0].failure_reasons)

    def test_status_mismatch_detected(self):
        bad = replace(self.cases[0], expected_status="abstained")
        report = self.evaluator.evaluate((bad,))
        self.assertIn("status_mismatch", report.outcomes[0].failure_reasons)

    def test_regression_identified(self):
        baseline = self.evaluator.evaluate(self.cases)
        changed = self.cases[:-1] + (replace(self.cases[-1], expected_answer="wrong"),)
        current = self.evaluator.evaluate(changed)
        self.assertEqual(IntelligenceEvaluator.regression(current, baseline), ("decision",))

    def test_changed_case_set_flagged(self):
        baseline = self.evaluator.evaluate(self.cases)
        current = self.evaluator.evaluate(self.cases[:-1])
        self.assertEqual(IntelligenceEvaluator.regression(current, baseline), ("case_set_changed",))

    def test_duplicate_case_rejected(self):
        with self.assertRaises(ValueError):
            self.evaluator.evaluate((self.cases[0], self.cases[0]))

    def test_empty_suite_rejected(self):
        with self.assertRaises(ValueError):
            self.evaluator.evaluate(())

    def test_unexpected_payload_becomes_failure(self):
        case = EvaluationCase("bad",
                              PipelineRequest("r5", "reason",
                                              {"query": "a", "facts": (), "rules": (),
                                               "execute": True}),
                              "resolved", "a", True)
        report = self.evaluator.evaluate((case,))
        self.assertEqual(report.status, "fail")
        self.assertEqual(report.outcomes[0].observed_status, "exception")

    def test_no_external_truth_claim(self):
        report = self.evaluator.evaluate(self.cases)
        self.assertIn("no_external_truth_validation", report.limitations)


if __name__ == "__main__":
    unittest.main()
