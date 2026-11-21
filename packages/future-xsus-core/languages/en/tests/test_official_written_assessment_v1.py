import copy
import unittest
from languages.en.evaluation.official_written_assessment_v1 import assess_official_written_comparison_v1 as assess


def comparison(baseline=2,candidate=3):
    benchmarks={}
    for name in ("written-v4","written-v5"):
        benchmarks[name]={
            "cases":4,"benchmark_sha256":"a"*64,
            "baseline":{"accepted":baseline,"exact_matches":1,"preserved_all_facts":2},
            "candidate":{"accepted":candidate,"exact_matches":1,"preserved_all_facts":2},
            "delta_accepted":candidate-baseline,"delta_exact_matches":0,
            "delta_preserved_all_facts":0,
        }
    return {"contract":"future-xsus-core.official-written-comparison.v1",
            "benchmarks":benchmarks,
            "benchmark_regression_detected":candidate<baseline,
            "candidate_automatically_approved":False,
            "human_release_required":True,"production_deployed":False}


class OfficialWrittenAssessmentV1Tests(unittest.TestCase):
    def test_contract(self):
        self.assertEqual(assess(comparison())["contract"],"future-xsus-core.official-written-assessment.v1")

    def test_total_cases(self):
        self.assertEqual(assess(comparison())["totals"]["cases"],8)

    def test_total_acceptance_delta(self):
        self.assertEqual(assess(comparison())["acceptance_delta"],2)

    def test_measured_gain(self):
        self.assertTrue(assess(comparison())["has_measured_acceptance_gain"])

    def test_non_regression(self):
        self.assertTrue(assess(comparison())["passes_benchmark_non_regression"])

    def test_regression(self):
        self.assertFalse(assess(comparison(3,2))["passes_benchmark_non_regression"])

    def test_regression_reasons(self):
        self.assertIn("regression:written-v4:accepted",assess(comparison(3,2))["reasons"])

    def test_no_gain(self):
        self.assertIn("no_net_acceptance_gain",assess(comparison(2,2))["reasons"])

    def test_no_automatic_approval(self):
        self.assertFalse(assess(comparison())["candidate_automatically_approved"])

    def test_no_release(self):
        self.assertFalse(assess(comparison())["release_authorized"])

    def test_no_deployment(self):
        self.assertFalse(assess(comparison())["production_deployed"])

    def test_quality_review(self):
        self.assertTrue(assess(comparison())["requires_independent_quality_review"])

    def test_missing_benchmark(self):
        row=comparison()
        del row["benchmarks"]["written-v5"]
        with self.assertRaises(ValueError):
            assess(row)

    def test_bad_delta(self):
        row=comparison()
        row["benchmarks"]["written-v4"]["delta_accepted"]=99
        with self.assertRaises(ValueError):
            assess(row)

    def test_bad_hash(self):
        row=comparison()
        row["benchmarks"]["written-v4"]["benchmark_sha256"]="bad"
        with self.assertRaises(ValueError):
            assess(row)

    def test_bad_metric(self):
        row=comparison()
        row["benchmarks"]["written-v4"]["candidate"]["accepted"]=5
        with self.assertRaises(ValueError):
            assess(row)

    def test_boolean_metric(self):
        row=comparison()
        row["benchmarks"]["written-v4"]["candidate"]["accepted"]=True
        with self.assertRaises(ValueError):
            assess(row)

    def test_mismatched_regression_flag(self):
        row=comparison(3,2)
        row["benchmark_regression_detected"]=False
        with self.assertRaises(ValueError):
            assess(row)

    def test_deployment_claim_rejected(self):
        row=comparison()
        row["production_deployed"]=True
        with self.assertRaises(ValueError):
            assess(row)

    def test_invalid_contract(self):
        with self.assertRaises(ValueError):
            assess({})

    def test_fact_regression(self):
        row=comparison()
        row["benchmarks"]["written-v4"]["candidate"]["preserved_all_facts"]=1
        row["benchmarks"]["written-v4"]["delta_preserved_all_facts"]=-1
        row["benchmark_regression_detected"]=True
        self.assertFalse(assess(row)["passes_benchmark_non_regression"])
