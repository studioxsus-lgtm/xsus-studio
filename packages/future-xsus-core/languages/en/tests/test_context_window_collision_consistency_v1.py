"""Validate relationships between distinct windows and collision counts."""
import unittest
from languages.en.evaluation.context_window_decision_v1 import inspect_context_window_decision_v1 as decide

def report(distinct=10, collisions=0):
    def row():
        return {"mean_first_target_rank":10.0,
                "mean_best_to_target_logit_gap":1.0,
                "first_target_top_one_correct":0,
                "matched_target_preferred_cases":0,
                "first_target_cases":10,
                "distinct_context_windows":distinct,
                "colliding_cases":collisions,
                "greedy_winner_changed_cases":0}
    return {"cases":10,"weights_retrained":False,
            "release_authorized":False,"production_context_changed":False,
            "windows":{str(size):row() for size in (16,32,64)}}

class CollisionConsistency(unittest.TestCase):
    def test_all_unique_requires_zero_collisions(self):
        self.assertFalse(decide(report(10,0))["release_authorized"])
    def test_all_unique_rejects_nonzero_collisions(self):
        for collisions in (1,2,10):
            with self.subTest(collisions=collisions), self.assertRaises(ValueError):
                decide(report(10,collisions))
    def test_nonunique_requires_nonzero_collisions(self):
        for distinct in (1,5,9):
            with self.subTest(distinct=distinct), self.assertRaises(ValueError):
                decide(report(distinct,0))
    def test_collisions_cannot_be_less_than_duplicates(self):
        for distinct,collisions in ((1,8),(2,7),(5,4),(9,0)):
            with self.subTest(distinct=distinct,collisions=collisions), self.assertRaises(ValueError):
                decide(report(distinct,collisions))
    def test_valid_nonunique_collision_groups(self):
        for distinct,collisions in ((1,10),(2,9),(5,6),(9,2)):
            with self.subTest(distinct=distinct,collisions=collisions):
                self.assertFalse(decide(report(distinct,collisions))["quality_improvement_proven"])
    def test_one_invalid_window_rejects_full_report(self):
        data=report()
        data["windows"]["64"]["distinct_context_windows"]=1
        data["windows"]["64"]["colliding_cases"]=0
        with self.assertRaises(ValueError): decide(data)
    def test_input_not_mutated(self):
        data=report(5,6)
        before=repr(data)
        decide(data)
        self.assertEqual(repr(data),before)
if __name__=="__main__":
    unittest.main()
