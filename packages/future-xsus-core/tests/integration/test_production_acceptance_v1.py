import copy
import unittest
from services.api.production_acceptance_v1 import acceptance_report, EXTERNAL_GATES

def sample():
    return {"recovery": "pass", "scenarios": [
        {"concurrency": c, "requests": c*8, "completed": c*8, "unavailable": 0,
         "p50_ms": 1, "p95_ms": 2, "p99_ms": 3, "successful_requests_per_second": 100}
        for c in (1,4,8,16,32)]}

class ProductionAcceptanceTests(unittest.TestCase):
    def test_valid_local_evidence_never_authorizes_deployment(self):
        result = acceptance_report(sample())
        self.assertTrue(result["load_evidence_valid"])
        self.assertFalse(result["production_ready"])
        self.assertFalse(result["deployment_authorized"])
        self.assertEqual(result["pending_external_gates"], list(EXTERNAL_GATES))

    def test_invalid_reports(self):
        for key, value in (("completed", 0), ("requests", 999), ("unavailable", 1),
                           ("p95_ms", 4), ("p99_ms", float("inf")),
                           ("concurrency", True), ("successful_requests_per_second", 0)):
            with self.subTest(key=key):
                report = sample()
                report["scenarios"][0][key] = value
                self.assertEqual(acceptance_report(report)["status"], "blocked")

    def test_missing_or_failed_recovery(self):
        for report in (None, {}, {"recovery": "fail"}, {"recovery": "pass", "scenarios": []}):
            self.assertFalse(acceptance_report(report)["load_evidence_valid"])

    def test_overload_accounting(self):
        report = sample()
        report["scenarios"][-1].update(completed=128, unavailable=128)
        self.assertTrue(acceptance_report(report)["load_evidence_valid"])
        report["scenarios"][0].update(completed=7, unavailable=1)
        self.assertFalse(acceptance_report(report)["load_evidence_valid"])
