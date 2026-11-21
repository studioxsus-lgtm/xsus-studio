"""Seeded held-out symbolic generalization benchmark."""
import unittest
from core.intelligence.generalization_v1 import GeneralizationEvaluator, _oracle
from core.intelligence.reasoning_v1 import Rule


class GeneralizationTests(unittest.TestCase):
    def setUp(self):
        self.evaluator = GeneralizationEvaluator()

    def test_three_levels(self):
        report = self.evaluator.run()
        self.assertEqual(report.status, "pass")
        self.assertEqual(tuple(s.difficulty for s in report.scores),
                         ("short", "medium", "long"))

    def test_72_generated_cases(self):
        report = self.evaluator.run()
        self.assertEqual(sum(s.total for s in report.scores), 72)
        self.assertTrue(all(s.correct == s.total for s in report.scores))

    def test_reproducible_seed(self):
        self.assertEqual(self.evaluator.run(seed=17), self.evaluator.run(seed=17))

    def test_different_seed(self):
        self.assertEqual(self.evaluator.run(seed=17).status, "pass")
        self.assertEqual(self.evaluator.run(seed=19).status, "pass")

    def test_small_and_large_batches(self):
        self.assertEqual(self.evaluator.run(cases_per_level=1).status, "pass")
        self.assertEqual(self.evaluator.run(cases_per_level=64).status, "pass")

    def test_oracle_unknown_is_not_disproof(self):
        self.assertFalse(_oracle(("a",), (Rule(("b",), "c"),), "c"))

    def test_oracle_chain(self):
        self.assertTrue(_oracle(("a",), (Rule(("a",), "b"),
                                         Rule(("b",), "c")), "c"))

    def test_invalid_bounds(self):
        for kwargs in ({"seed": -1}, {"cases_per_level": 0},
                       {"cases_per_level": 65}, {"seed": True}):
            with self.subTest(kwargs=kwargs):
                with self.assertRaises(ValueError):
                    self.evaluator.run(**kwargs)

    def test_limitations_explicit(self):
        self.assertIn("not_natural_language_or_open_world_generalization",
                      self.evaluator.run().limitations)


if __name__ == "__main__":
    unittest.main()
