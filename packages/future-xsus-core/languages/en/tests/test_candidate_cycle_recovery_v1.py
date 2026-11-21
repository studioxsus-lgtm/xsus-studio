import tempfile
import unittest
from dataclasses import replace
from pathlib import Path
from languages.en.learning.candidate_cycle_recovery_v1 import (
    CandidateRecoveryRequestV1 as Request,
    inspect_candidate_cycle_recovery_v1 as inspect,
    acknowledge_interrupted_candidate_cycle_v1 as acknowledge,
)
from languages.en.learning.candidate_cycle_journal_v1 import record_candidate_cycle_state_v1 as record
from languages.en.learning.candidate_cycle_lock_v1 import exclusive_candidate_cycle_lock_v1 as lock


class CandidateCycleRecoveryV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path=Path(self.tmp.name)/"report.json"
        self.revision="a"*64
        self.request=Request(self.path,self.revision,True)

    def test_absent_inspection(self):
        self.assertEqual(inspect(self.path).state,"absent")

    def test_running_inspection(self):
        record(self.path,self.revision,"running")
        self.assertTrue(inspect(self.path).needs_review)

    def test_acknowledge_running(self):
        record(self.path,self.revision,"running")
        self.assertEqual(acknowledge(self.request)["state"],"interrupted")

    def test_persists_interrupted(self):
        record(self.path,self.revision,"running")
        acknowledge(self.request)
        self.assertEqual(inspect(self.path).state,"interrupted")

    def test_requires_review(self):
        record(self.path,self.revision,"running")
        self.assertTrue(acknowledge(self.request)["requires_artifact_review"])

    def test_no_resume(self):
        record(self.path,self.revision,"running")
        self.assertFalse(acknowledge(self.request)["training_resumed"])

    def test_no_activation(self):
        record(self.path,self.revision,"running")
        self.assertFalse(acknowledge(self.request)["candidate_activated"])

    def test_no_release(self):
        record(self.path,self.revision,"running")
        self.assertFalse(acknowledge(self.request)["release_authorized"])

    def test_explicit_approval_required(self):
        record(self.path,self.revision,"running")
        with self.assertRaises(PermissionError):
            acknowledge(replace(self.request,operator_acknowledged=False))

    def test_truthy_nonboolean_denied(self):
        record(self.path,self.revision,"running")
        with self.assertRaises(PermissionError):
            acknowledge(replace(self.request,operator_acknowledged=1))

    def test_wrong_revision_denied(self):
        record(self.path,self.revision,"running")
        with self.assertRaises(ValueError):
            acknowledge(replace(self.request,expected_revision="b"*64))

    def test_invalid_revision_denied(self):
        with self.assertRaises(ValueError):
            acknowledge(replace(self.request,expected_revision="invalid"))

    def test_no_journal_denied(self):
        with self.assertRaises(ValueError):
            acknowledge(self.request)

    def test_completed_denied(self):
        record(self.path,self.revision,"completed")
        with self.assertRaises(ValueError):
            acknowledge(self.request)

    def test_failed_denied(self):
        record(self.path,self.revision,"failed")
        with self.assertRaises(ValueError):
            acknowledge(self.request)

    def test_repeat_denied(self):
        record(self.path,self.revision,"running")
        acknowledge(self.request)
        with self.assertRaises(ValueError):
            acknowledge(self.request)

    def test_concurrent_lock_denied(self):
        record(self.path,self.revision,"running")
        with lock(self.path):
            with self.assertRaises(RuntimeError):
                acknowledge(self.request)

    def test_no_report_written(self):
        record(self.path,self.revision,"running")
        acknowledge(self.request)
        self.assertFalse(self.path.exists())

    def test_bad_request_denied(self):
        with self.assertRaises(ValueError):
            acknowledge(None)

    def test_bad_path_denied(self):
        with self.assertRaises(ValueError):
            acknowledge(replace(self.request,report_path="report.json"))
