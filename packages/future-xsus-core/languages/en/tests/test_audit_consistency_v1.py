import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import sqlite3
import unittest

from languages.en.learning.review_audit_v1 import SQLiteReviewAuditV1
from languages.en.learning.audit_consistency_v1 import inspect_review_audit_consistency_v1


class AuditConsistencyV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.audit = SQLiteReviewAuditV1(Path(self.tmp.name) / "audit.sqlite")
        self.cid = hashlib.sha256(b"english-audit").hexdigest()

    def add(self, status="blocked", reasons=None):
        if reasons is None:
            reasons = ["artifact_missing"] if status == "blocked" else []
        return self.audit.record("alice", {
            "contract": "future-xsus-core.staged-review-gate.v1",
            "candidate_id": self.cid, "status": status,
            "reasons": reasons, "review_eligible_at_check": status == "ready_for_human_review",
            "release_authorized": False,
        })

    def check(self, **kwargs):
        return inspect_review_audit_consistency_v1(self.audit, "alice", self.cid, **kwargs)

    def mutate(self, query, values=()):
        with sqlite3.connect(self.audit.path) as db:
            db.execute(query, values)

    def test_empty_is_missing(self):
        self.assertEqual(self.check()["status"], "inconsistent_or_missing")

    def test_empty_reason(self):
        self.assertIn("no_audit_events", self.check()["reasons"])

    def test_one_blocked_is_consistent(self):
        self.add()
        self.assertEqual(self.check()["status"], "consistent_at_check")

    def test_one_ready_is_consistent(self):
        self.add("ready_for_human_review")
        self.assertEqual(self.check()["status"], "consistent_at_check")

    def test_multiple_events_consistent(self):
        self.add()
        self.add("ready_for_human_review")
        self.assertEqual(self.check()["event_count"], 2)

    def test_latest_sequence(self):
        self.add()
        last = self.add()
        self.assertEqual(self.check()["latest_sequence"], last.sequence)

    def test_expected_sequence_matches(self):
        event = self.add()
        self.assertEqual(self.check(expected_latest_sequence=event.sequence)["status"], "consistent_at_check")

    def test_expected_sequence_mismatch(self):
        event = self.add()
        self.add()
        self.assertIn("latest_sequence_mismatch", self.check(expected_latest_sequence=event.sequence)["reasons"])

    def test_invalid_expected_sequence(self):
        with self.assertRaises(ValueError):
            self.check(expected_latest_sequence=0)

    def test_bool_expected_sequence_rejected(self):
        with self.assertRaises(ValueError):
            self.check(expected_latest_sequence=True)

    def test_corrupt_json_detected(self):
        event = self.add()
        self.mutate("UPDATE xsus_review_audit_v1 SET reasons_json='{' WHERE sequence=?", (event.sequence,))
        self.assertIn("invalid_reason_encoding", self.check()["reasons"])

    def test_non_list_json_detected(self):
        event = self.add()
        self.mutate("UPDATE xsus_review_audit_v1 SET reasons_json='{}' WHERE sequence=?", (event.sequence,))
        self.assertIn("invalid_reason_encoding", self.check()["reasons"])

    def test_empty_block_reason_detected(self):
        event = self.add()
        self.mutate("UPDATE xsus_review_audit_v1 SET reasons_json='[]' WHERE sequence=?", (event.sequence,))
        self.assertIn("inconsistent_status_reasons", self.check()["reasons"])

    def test_ready_with_reason_detected(self):
        event = self.add("ready_for_human_review")
        self.mutate("UPDATE xsus_review_audit_v1 SET reasons_json='[\"unexpected\"]' WHERE sequence=?", (event.sequence,))
        self.assertIn("inconsistent_status_reasons", self.check()["reasons"])

    def test_timestamp_corruption_detected(self):
        event = self.add()
        self.mutate("UPDATE xsus_review_audit_v1 SET checked_at='not-a-time' WHERE sequence=?", (event.sequence,))
        self.assertIn("invalid_audit_timestamp", self.check()["reasons"])

    def test_timestamp_regression_detected(self):
        first = self.add()
        second = self.add()
        self.mutate("UPDATE xsus_review_audit_v1 SET checked_at='2000-01-01T00:00:00+00:00' WHERE sequence=?", (second.sequence,))
        self.assertIn("timestamp_regression", self.check()["reasons"])

    def test_owner_isolation(self):
        self.add()
        result = inspect_review_audit_consistency_v1(self.audit, "bob", self.cid)
        self.assertEqual(result["event_count"], 0)

    def test_no_release(self):
        self.add()
        self.assertFalse(self.check()["release_authorized"])

    def test_no_tamper_evidence_claim(self):
        self.add()
        self.assertFalse(self.check()["tamper_evident"])

    def test_no_deletion_detection_claim(self):
        self.add()
        self.assertFalse(self.check()["deletion_detection_guaranteed"])

    def test_invalid_audit_rejected(self):
        with self.assertRaises(ValueError):
            inspect_review_audit_consistency_v1(None, "alice", self.cid)
