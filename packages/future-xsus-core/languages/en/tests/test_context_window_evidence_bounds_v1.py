"""Reject malformed aggregate collision and winner-change evidence."""
import unittest
from languages.en.evaluation.context_window_decision_v1 import inspect_context_window_decision_v1 as decide

def valid():
    def row():
        return {"mean_first_target_rank":10.0,"mean_best_to_target_logit_gap":1.0,
                "first_target_top_one_correct":0,"matched_target_preferred_cases":0,
                "first_target_cases":10,"distinct_context_windows":10,
                "colliding_cases":0,"greedy_winner_changed_cases":0}
    return {"cases":10,"weights_retrained":False,"release_authorized":False,
            "production_context_changed":False,
            "windows":{str(size):row() for size in (16,32,64)}}

class EvidenceBounds(unittest.TestCase):
    def test_valid_evidence(self):
        self.assertFalse(decide(valid())["release_authorized"])
    def test_invalid_distinct_context_count(self):
        for value in (None,False,True,-1,0,11,10.0,"10",float("nan")):
            with self.subTest(value=value):
                report=valid()
                report["windows"]["32"]["distinct_context_windows"]=value
                with self.assertRaises(ValueError): decide(report)
    def test_invalid_collision_count(self):
        for value in (None,False,True,-1,11,0.0,"0",float("inf")):
            with self.subTest(value=value):
                report=valid()
                report["windows"]["64"]["colliding_cases"]=value
                with self.assertRaises(ValueError): decide(report)
    def test_invalid_winner_change_count(self):
        for value in (None,False,True,-1,11,0.0,"0",float("nan")):
            with self.subTest(value=value):
                report=valid()
                report["windows"]["16"]["greedy_winner_changed_cases"]=value
                with self.assertRaises(ValueError): decide(report)
    def test_valid_boundaries(self):
        report=valid()
        report["windows"]["16"]["distinct_context_windows"]=1
        report["windows"]["16"]["colliding_cases"]=10
        report["windows"]["16"]["greedy_winner_changed_cases"]=10
        self.assertFalse(decide(report)["quality_improvement_proven"])
if __name__=="__main__":
    unittest.main()
