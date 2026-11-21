"""Formal inference and proof replay tests for Future XSUS Core."""
import unittest
from dataclasses import replace
from core.intelligence.reasoning_v1 import (
    Rule, ProofStep, ReasoningEngine, verify_proof,
)


class ReasoningTests(unittest.TestCase):
    def test_multi_hop_proof(self):
        rules = (Rule(("human",), "mortal"),
                 Rule(("mortal",), "finite"),
                 Rule(("finite", "documented"), "reviewable"))
        facts = ("human", "documented")
        result = ReasoningEngine(facts, rules).prove("reviewable")
        self.assertTrue(result.entailed)
        self.assertEqual(result.status, "entailed")
        self.assertTrue(verify_proof(result, facts, rules))
        self.assertEqual(result.proof[-1].conclusion, "reviewable")

    def test_missing_premise_does_not_prove(self):
        rules = (Rule(("human", "documented"), "reviewable"),)
        result = ReasoningEngine(("human",), rules).prove("reviewable")
        self.assertEqual(result.status, "unknown")
        self.assertFalse(result.entailed)

    def test_fact_proof(self):
        result = ReasoningEngine(("verified",), ()).prove("verified")
        self.assertTrue(verify_proof(result, ("verified",), ()))

    def test_cyclic_rules_terminate(self):
        rules = (Rule(("a",), "b"), Rule(("b",), "a"))
        result = ReasoningEngine(("a",), rules).prove("b")
        self.assertTrue(result.entailed)
        self.assertLessEqual(result.rounds, 2)

    def test_tampered_proof_rejected(self):
        rules = (Rule(("a",), "b"),)
        result = ReasoningEngine(("a",), rules).prove("b")
        forged = replace(result, proof=(ProofStep("b", (), None),))
        self.assertFalse(verify_proof(forged, ("a",), rules))

    def test_wrong_rule_rejected(self):
        rules = (Rule(("a",), "b"),)
        result = ReasoningEngine(("a",), rules).prove("b")
        self.assertFalse(verify_proof(result, ("a",), (Rule(("a",), "c"),)))

    def test_unsupported_logic_rejected(self):
        with self.assertRaises(ValueError):
            Rule(("not a",), "b")
        with self.assertRaises(ValueError):
            ReasoningEngine(("a; import os",), ())
        with self.assertRaises(ValueError):
            ReasoningEngine((), ()).prove("NOTHING")

    def test_bounded_input(self):
        with self.assertRaises(ValueError):
            ReasoningEngine(tuple(f"x{i}" for i in range(257)), ())
        with self.assertRaises(ValueError):
            Rule(tuple(f"x{i}" for i in range(9)), "done")

    def test_conjunction(self):
        rules = (Rule(("approved", "tested"), "release_ready"),)
        engine = ReasoningEngine(("approved", "tested"), rules)
        result = engine.prove("release_ready")
        self.assertTrue(verify_proof(result, engine.facts, rules))

    def test_no_real_world_truth_claim(self):
        result = ReasoningEngine(("claim",), ()).prove("claim")
        self.assertIn("valid_only_for_supplied_facts_and_rules", result.limitations)


if __name__ == "__main__":
    unittest.main()
