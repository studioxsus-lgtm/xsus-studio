"""Decision hard constraints, deterministic ranking, and tamper resistance."""
import unittest
from dataclasses import replace
from core.intelligence.decision_v1 import Criterion, Option, DecisionEngine


class DecisionTests(unittest.TestCase):
    def setUp(self):
        self.engine = DecisionEngine()
        self.criteria = (Criterion("security", 5, minimum=80),
                         Criterion("speed", 2), Criterion("quality", 3, minimum=70))
        self.options = (
            Option("fast", "Fast but insecure", (("security", 50), ("speed", 100), ("quality", 80))),
            Option("safe", "Secure and balanced", (("security", 90), ("speed", 70), ("quality", 90))),
            Option("slow", "Secure and slower", (("security", 90), ("speed", 40), ("quality", 80))),
        )

    def test_hard_constraints_override_score(self):
        decision = self.engine.decide(self.criteria, self.options)
        self.assertEqual(decision.winner_id, "safe")
        fast = next(r for r in decision.ranking if r.option_id == "fast")
        self.assertFalse(fast.eligible)
        self.assertEqual(fast.rejected_by, ("security",))

    def test_replay_verifies(self):
        decision = self.engine.decide(self.criteria, self.options)
        self.assertTrue(self.engine.verify(decision, self.criteria, self.options))

    def test_tampered_winner_fails(self):
        decision = self.engine.decide(self.criteria, self.options)
        self.assertFalse(self.engine.verify(replace(decision, winner_id="fast"),
                                            self.criteria, self.options))

    def test_no_eligible_option(self):
        result = self.engine.decide((Criterion("security", 1, minimum=100),),
                                    (Option("a", "A", (("security", 50),)),))
        self.assertEqual(result.status, "no_eligible_option")
        self.assertIsNone(result.winner_id)

    def test_tie_break_deterministic(self):
        criteria = (Criterion("quality", 1),)
        options = (Option("z", "Z", (("quality", 90),)),
                   Option("a", "A", (("quality", 90),)))
        self.assertEqual(self.engine.decide(criteria, options).winner_id, "a")

    def test_missing_score_rejected(self):
        with self.assertRaises(ValueError):
            self.engine.decide(self.criteria,
                               (Option("a", "A", (("security", 90),)),))

    def test_duplicate_score_rejected(self):
        with self.assertRaises(ValueError):
            Option("a", "A", (("security", 90), ("security", 80)))

    def test_duplicate_option_rejected(self):
        with self.assertRaises(ValueError):
            self.engine.decide((Criterion("quality", 1),),
                               (Option("a", "A", (("quality", 90),)),
                                Option("a", "B", (("quality", 70),))))

    def test_invalid_score_rejected(self):
        with self.assertRaises(ValueError):
            Option("a", "A", (("quality", 101),))

    def test_assumptions_not_truth(self):
        result = self.engine.decide(self.criteria, self.options)
        self.assertIn("scores_are_supplied_not_verified", result.limitations)


if __name__ == "__main__":
    unittest.main()
