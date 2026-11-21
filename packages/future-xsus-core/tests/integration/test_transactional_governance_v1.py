"""Transactional review commit, interruption recovery, and fail-closed checks."""
import tempfile
import unittest
from pathlib import Path
from core.intelligence.audit_v1 import AuditJournal
from core.intelligence.improvement_v1 import ImprovementVerdict
from core.intelligence.persistent_governance_v1 import PersistentGovernance
from core.intelligence.transactional_governance_v1 import TransactionalGovernance


class TransactionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        directory = Path(self.temp.name)
        self.snapshot = directory / "snapshot.json"
        self.audit = directory / "audit.jsonl"
        self.store = PersistentGovernance(self.snapshot)
        verdict = ImprovementVerdict("eligible_for_manual_review", "proposal1",
                                     1, 2, 2, (), ("fixed",), ())
        self.store.registry.register("alice", "candidate1", verdict)
        self.store.save()
        self.tx = TransactionalGovernance(self.snapshot, self.audit)

    def test_commit_review(self):
        result = self.tx.review("alice", "candidate1", reviewer_id="reviewer",
                                approve=True, expected_revision=0, note="Approved")
        self.assertEqual(result.status, "approved_for_release_review")
        self.assertEqual(len(AuditJournal(self.audit).read_verified()), 2)
        self.assertEqual(self.tx.recover(), ())

    def test_rejected_review(self):
        result = self.tx.review("alice", "candidate1", reviewer_id="reviewer",
                                approve=False, expected_revision=0, note="Rejected")
        self.assertEqual(result.status, "rejected")

    def test_prepare_without_snapshot_recovers_as_abort(self):
        AuditJournal(self.audit).append("alice", "candidate1",
                                        "prepare:1:approved_for_release_review")
        self.assertEqual(self.tx.recover(), (("alice", "candidate1", "abort"),))
        self.assertEqual(self.tx.recover(), ())

    def test_prepare_with_snapshot_recovers_as_commit(self):
        AuditJournal(self.audit).append("alice", "candidate1",
                                        "prepare:1:approved_for_release_review")
        store = PersistentGovernance(self.snapshot)
        store.registry.review("alice", "candidate1", reviewer_id="reviewer",
                              approve=True, expected_revision=0, note="Approved")
        store.save()
        self.assertEqual(self.tx.recover(), (("alice", "candidate1", "commit"),))

    def test_pending_transaction_blocks_review(self):
        AuditJournal(self.audit).append("alice", "candidate1",
                                        "prepare:1:approved_for_release_review")
        with self.assertRaises(ValueError):
            self.tx.review("alice", "candidate1", reviewer_id="reviewer",
                           approve=True, expected_revision=0, note="Blocked")

    def test_wrong_owner_rejected(self):
        with self.assertRaises(LookupError):
            self.tx.review("bob", "candidate1", reviewer_id="reviewer",
                           approve=True, expected_revision=0, note="Blocked")

    def test_double_review_rejected(self):
        self.tx.review("alice", "candidate1", reviewer_id="reviewer",
                       approve=True, expected_revision=0, note="First")
        with self.assertRaises(ValueError):
            self.tx.review("alice", "candidate1", reviewer_id="reviewer",
                           approve=True, expected_revision=1, note="Again")

    def test_corrupt_audit_rejected(self):
        self.audit.write_text('{"broken":')
        with self.assertRaises(Exception):
            self.tx.recover()


if __name__ == "__main__":
    unittest.main()
