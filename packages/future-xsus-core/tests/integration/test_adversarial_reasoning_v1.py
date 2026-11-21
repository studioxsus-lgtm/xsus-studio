"""Adversarial Horn entailment, missing evidence, cycles and metamorphic checks."""
import unittest
from core.intelligence.adversarial_reasoning_v1 import (
    AdversarialCase, AdversarialReasoningHarness)
from core.intelligence.reasoning_v1 import Rule


class AdversarialReasoningTests(unittest.TestCase):
    def setUp(self):
        self.harness = AdversarialReasoningHarness()
        self.cases = (
            AdversarialCase("chain", ("a",),
                            (Rule(("a",), "b"), Rule(("b",), "c")), "c", True),
            AdversarialCase("missing_premise", ("a",),
                            (Rule(("a", "missing"), "b"),), "b", False),
            AdversarialCase("cycle_without_seed", (),
                            (Rule(("a",), "b"), Rule(("b",), "a")), "a", False),
            AdversarialCase("cycle_with_seed", ("a",),
                            (Rule(("a",), "b"), Rule(("b",), "a")), "b", True),
            AdversarialCase("irrelevant_facts", ("a", "unrelated"),
                            (Rule(("a",), "b"),), "b", True),
            AdversarialCase("unsupported_query", ("a",),
                            (Rule(("a",), "b"),), "unrelated", False),
            AdversarialCase("multiple_premises", ("a", "b"),
                            (Rule(("a", "b"), "c"),), "c", True),
        )

    def test_all_adversarial_cases(self):
        report = self.harness.evaluate(self.cases)
        self.assertEqual((report.status, report.passed, report.total),
                         ("pass", 7, 7))

    def test_fact_permutation(self):
        report = self.harness.evaluate(self.cases)
        self.assertTrue(all(dict(outcome.checks)["fact_permutation_invariant"]
                            for outcome in report.outcomes))

    def test_rule_permutation(self):
        report = self.harness.evaluate(self.cases)
        self.assertTrue(all(dict(outcome.checks)["rule_permutation_invariant"]
                            for outcome in report.outcomes))

    def test_missing_evidence_not_entailed(self):
        report = self.harness.evaluate(self.cases)
        self.assertFalse(report.outcomes[1].observed_entailed)

    def test_cycle_without_seed_not_entailed(self):
        report = self.harness.evaluate(self.cases)
        self.assertFalse(report.outcomes[2].observed_entailed)

    def test_incorrect_expected_result_detected(self):
        incorrect = AdversarialCase("wrong", ("a",),
                                    (Rule(("a",), "b"),), "b", False)
        report = self.harness.evaluate((incorrect,))
        self.assertEqual(report.status, "fail")
        self.assertFalse(dict(report.outcomes[0].checks)["expected_entailment"])

    def test_duplicate_case_ids_rejected(self):
        with self.assertRaises(ValueError):
            self.harness.evaluate(self.cases + (self.cases[0],))

    def test_limitations_explicit(self):
        report = self.harness.evaluate(self.cases)
        self.assertIn("not_open_world_generalization", report.limitations)


if __name__ == "__main__":
    unittest.main()
