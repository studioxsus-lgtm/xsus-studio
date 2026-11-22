import unittest
from core.intelligence.reasoning_v1 import Rule
from core.intelligence.adaptive_learning_v2 import LearningCase, evaluate_candidate

class AdaptiveLearningTests(unittest.TestCase):
    def setUp(self):
        self.dev=(LearningCase(("a",),"b",True),)
        self.hold=(LearningCase(("a","c"),"b",True),LearningCase(("c",),"b",False))
        self.candidate=(Rule(("a",),"b"),)
    def test_improvement(self):
        r=evaluate_candidate((),self.candidate,self.dev,self.hold)
        self.assertEqual(r["status"],"eligible_for_manual_review")
        self.assertFalse(r["promotion_authorized"])
    def test_no_improvement(self):
        self.assertEqual(evaluate_candidate(self.candidate,self.candidate,self.dev,self.hold)["status"],"insufficient_improvement")
    def test_regression(self):
        r=evaluate_candidate((),self.candidate+(Rule(("c",),"b"),),self.dev,self.hold)
        self.assertEqual(r["status"],"blocked")
        self.assertEqual(r["regressions"],1)
    def test_holdout_failure(self):
        r=evaluate_candidate((),self.candidate,self.dev,(LearningCase(("x",),"b",True),))
        self.assertEqual(r["holdout_failures"],1)
        self.assertEqual(r["status"],"blocked")
    def test_duplicate(self):
        with self.assertRaises(ValueError):
            evaluate_candidate((),self.candidate,self.dev,self.dev)
    def test_reordered_duplicates(self):
        with self.assertRaises(ValueError):
            evaluate_candidate((),self.candidate,(LearningCase(("a","c"),"b",True),),(LearningCase(("c","a"),"b",True),))
    def test_invalid_label(self):
        with self.assertRaises(ValueError):
            evaluate_candidate((),self.candidate,(LearningCase(("a",),"b",1),),self.hold)
