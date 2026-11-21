"""Recovery fault-injection matrix and replay invariants."""
import unittest
from core.intelligence.recovery_stress_v1 import RecoveryStressHarness


class RecoveryStressTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = RecoveryStressHarness().run()

    def test_all_scenarios_pass(self):
        self.assertEqual(self.report.status, "pass")

    def test_four_failure_boundaries_covered(self):
        self.assertEqual(tuple(s.point for s in self.report.scenarios),
                         ("before_prepare", "after_prepare",
                          "after_snapshot", "after_commit"))

    def test_before_prepare_remains_pending(self):
        self.assertEqual(self.report.scenarios[0].final_status, "pending_review")
        self.assertEqual(self.report.scenarios[0].journal_entries, 0)

    def test_after_prepare_aborts(self):
        self.assertEqual(self.report.scenarios[1].final_status, "pending_review")
        self.assertEqual(self.report.scenarios[1].journal_entries, 2)

    def test_after_snapshot_commits(self):
        self.assertEqual(self.report.scenarios[2].final_status,
                         "approved_for_release_review")
        self.assertEqual(self.report.scenarios[2].journal_entries, 2)

    def test_after_commit_is_idempotent(self):
        self.assertEqual(self.report.scenarios[3].final_status,
                         "approved_for_release_review")
        self.assertEqual(self.report.scenarios[3].journal_entries, 2)

    def test_no_claim_of_real_process_crash(self):
        self.assertIn("no_real_process_kill_or_power_failure",
                      self.report.limitations)


if __name__ == "__main__":
    unittest.main()
