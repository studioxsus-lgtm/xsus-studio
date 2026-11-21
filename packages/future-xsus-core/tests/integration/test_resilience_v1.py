"""Repeated deterministic requests and isolated errors under bounded stress."""
import unittest
from core.intelligence.resilience_v1 import ResilienceHarness
from core.intelligence.unified_pipeline_v1 import PipelineRequest, UnifiedIntelligencePipeline
from core.intelligence.reasoning_v1 import Rule


class ResilienceTests(unittest.TestCase):
    def setUp(self):
        self.valid = PipelineRequest(
            "good", "reason",
            {"query": "ready", "facts": ("tested",),
             "rules": (Rule(("tested",), "ready"),)})
        self.invalid = PipelineRequest(
            "bad", "reason",
            {"query": "ready", "facts": ("tested",),
             "rules": (), "execute": True})

    def test_repeated_valid_requests(self):
        report = ResilienceHarness().run((self.valid,), rounds=40)
        self.assertEqual(report.status, "pass")
        self.assertEqual(report.executions, 40)
        self.assertEqual(report.failures, 0)
        self.assertEqual(report.nondeterministic_ids, ())

    def test_isolated_error_does_not_stop_batch(self):
        report = ResilienceHarness().run((self.invalid, self.valid), rounds=5)
        self.assertEqual(report.executions, 10)
        self.assertEqual(report.failures, 5)
        self.assertEqual(report.outcomes[-1].status, "resolved")

    def test_unknown_payload_error_type_only(self):
        report = ResilienceHarness().run((self.invalid,), rounds=1)
        self.assertEqual(report.outcomes[0].error_type, "ValueError")
        self.assertEqual(report.outcomes[0].fingerprint, ())

    def test_round_bound(self):
        with self.assertRaises(ValueError):
            ResilienceHarness().run((self.valid,), rounds=101)

    def test_empty_requests_rejected(self):
        with self.assertRaises(ValueError):
            ResilienceHarness().run(())

    def test_duplicate_ids_rejected(self):
        with self.assertRaises(ValueError):
            ResilienceHarness().run((self.valid, self.valid))

    def test_nondeterminism_detected(self):
        class Alternating:
            def __init__(self):
                self.count = 0
                self.pipeline = UnifiedIntelligencePipeline()

            def run(self, request):
                from dataclasses import replace
                self.count += 1
                response = self.pipeline.run(request)
                return replace(response, answer="a" if self.count % 2 else "b")
        report = ResilienceHarness(Alternating()).run((self.valid,), rounds=4)
        self.assertEqual(report.nondeterministic_ids, ("good",))
        self.assertEqual(report.status, "fail")

    def test_exception_does_not_leak_message(self):
        class Failing:
            def run(self, request):
                raise RuntimeError("private-secret")
        report = ResilienceHarness(Failing()).run((self.valid,), rounds=1)
        self.assertEqual(report.outcomes[0].error_type, "RuntimeError")
        self.assertNotIn("private-secret", repr(report))


if __name__ == "__main__":
    unittest.main()
