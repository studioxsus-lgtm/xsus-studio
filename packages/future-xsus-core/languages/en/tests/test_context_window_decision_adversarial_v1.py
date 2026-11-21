"""Adversarial inputs must never silently authorize context-window promotion."""
import unittest
from copy import deepcopy
from languages.en.evaluation.context_window_decision_v1 import inspect_context_window_decision_v1 as decide

def valid():
    row=lambda rank,gap,top,matched: {
        "mean_first_target_rank":rank,
        "mean_best_to_target_logit_gap":gap,
        "first_target_top_one_correct":top,
        "matched_target_preferred_cases":matched,
        "first_target_cases":10,
    }
    return {
        "cases":10,
        "weights_retrained":False,
        "release_authorized":False,
        "production_context_changed":False,
        "windows":{"16":row(100.0,2.0,0,0),
                   "32":row(80.0,1.5,0,8),
                   "64":row(90.0,1.8,0,8)},
    }

class AdversarialDecisionTests(unittest.TestCase):
    def test_valid_report_stays_diagnostic_only(self):
        result=decide(valid())
        self.assertFalse(result["training_authorized"])
        self.assertFalse(result["release_authorized"])
        self.assertFalse(result["quality_improvement_proven"])
        self.assertTrue(result["independent_holdout_required"])

    def test_boolean_flags_must_be_exactly_false(self):
        for field in ("weights_retrained","release_authorized","production_context_changed"):
            for invalid in (True,None,0,1,"false",[],{}):
                with self.subTest(field=field,invalid=invalid):
                    report=valid()
                    report[field]=invalid
                    with self.assertRaises(ValueError): decide(report)

    def test_invalid_case_counts(self):
        for value in (None,False,True,0,1,-1,2.5,"10",[],{}):
            with self.subTest(value=value):
                report=valid()
                report["cases"]=value
                with self.assertRaises(ValueError): decide(report)

    def test_missing_or_invalid_window_container(self):
        for value in (None,[],(),"windows",0):
            with self.subTest(value=value):
                report=valid()
                report["windows"]=value
                with self.assertRaises(ValueError): decide(report)

    def test_each_window_is_required(self):
        for size in ("16","32","64"):
            with self.subTest(size=size):
                report=valid()
                del report["windows"][size]
                with self.assertRaises(ValueError): decide(report)

    def test_each_window_must_be_mapping(self):
        for size in ("16","32","64"):
            with self.subTest(size=size):
                report=valid()
                report["windows"][size]=None
                with self.assertRaises(ValueError): decide(report)

    def test_missing_numeric_metrics(self):
        for metric in ("mean_first_target_rank","mean_best_to_target_logit_gap"):
            report=valid()
            del report["windows"]["32"][metric]
            with self.subTest(metric=metric), self.assertRaises(ValueError): decide(report)

    def test_invalid_rank_values(self):
        for value in (None,False,True,-1,0,float("nan"),float("inf"),float("-inf"),"2",[],{}):
            with self.subTest(value=value):
                report=valid()
                report["windows"]["32"]["mean_first_target_rank"]=value
                with self.assertRaises(ValueError): decide(report)

    def test_invalid_gap_values(self):
        for value in (None,False,True,-1,float("nan"),float("inf"),float("-inf"),"2",[],{}):
            with self.subTest(value=value):
                report=valid()
                report["windows"]["32"]["mean_best_to_target_logit_gap"]=value
                with self.assertRaises(ValueError): decide(report)

    def test_invalid_first_target_counts(self):
        for value in (None,False,True,9,11,10.0,"10"):
            with self.subTest(value=value):
                report=valid()
                report["windows"]["64"]["first_target_cases"]=value
                with self.assertRaises(ValueError): decide(report)

    def test_invalid_preference_counts(self):
        for value in (None,False,True,-1,11,1.5,"8"):
            with self.subTest(value=value):
                report=valid()
                report["windows"]["32"]["matched_target_preferred_cases"]=value
                with self.assertRaises(ValueError): decide(report)

    def test_invalid_top_one_counts(self):
        for value in (None,False,True,-1,11,1.5,"8"):
            with self.subTest(value=value):
                report=valid()
                report["windows"]["32"]["first_target_top_one_correct"]=value
                with self.assertRaises(ValueError): decide(report)

    def test_report_is_not_mutated(self):
        report=valid()
        snapshot=deepcopy(report)
        decide(report)
        self.assertEqual(report,snapshot)

    def test_comparisons_never_imply_release(self):
        report=valid()
        report["windows"]["32"]["first_target_top_one_correct"]=10
        report["windows"]["32"]["matched_target_preferred_cases"]=10
        result=decide(report)
        self.assertFalse(result["release_authorized"])
        self.assertFalse(result["training_authorized"])
        self.assertFalse(result["quality_improvement_proven"])

if __name__=="__main__":
    unittest.main()
