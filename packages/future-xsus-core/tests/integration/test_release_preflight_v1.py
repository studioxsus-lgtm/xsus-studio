import unittest
from unittest.mock import patch
from core.intelligence.release_preflight_v1 import ReleasePreflight, EXTERNAL_GATES


class ReleasePreflightTests(unittest.TestCase):
    def test_local_checks(self):
        result = ReleasePreflight().check()
        self.assertEqual(result.status, "local_pass")
        self.assertEqual(len(result.checks), 4)
        self.assertTrue(all(passed for _, passed in result.checks))

    def test_never_certifies_production(self):
        result = ReleasePreflight().check()
        self.assertFalse(result.production_ready)
        self.assertEqual(result.pending_external_gates, EXTERNAL_GATES)

    def test_failure_blocks_release(self):
        with patch("core.intelligence.release_preflight_v1.ConsolidatedReliabilityGate.check",
                   side_effect=RuntimeError("injected")):
            result = ReleasePreflight().check()
        self.assertEqual(result.status, "blocked")
        self.assertIn(("consolidated_reliability", False), result.checks)
        self.assertFalse(result.production_ready)
