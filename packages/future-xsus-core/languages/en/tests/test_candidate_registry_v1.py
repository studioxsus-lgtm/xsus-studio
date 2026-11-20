import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from languages.en.learning.candidate_registry_v1 import SQLiteCandidateRegistryV1
from languages.en.learning.candidate_quarantine_v1 import CandidateQuarantineDecisionV1

ID = "a" * 64
OTHER = "b" * 64


def decision(status="pending_human_review", reasons=()):
    return CandidateQuarantineDecisionV1(status, reasons, True, False, False)


class CandidateRegistryV1Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "registry.db"
        self.registry = SQLiteCandidateRegistryV1(self.path)

    def test_register_pending(self):
        self.assertEqual(self.registry.register("alice", ID, decision()).status, "pending_human_review")

    def test_register_quarantine(self):
        self.assertEqual(self.registry.register("alice", ID, decision("quarantined", ("revoked",))).status, "quarantined")

    def test_persists_across_reopen(self):
        self.registry.register("alice", ID, decision())
        self.assertEqual(SQLiteCandidateRegistryV1(self.path).get("alice", ID).revision, 1)

    def test_owner_isolation(self):
        self.registry.register("alice", ID, decision())
        with self.assertRaises(KeyError):
            self.registry.get("bob", ID)

    def test_same_id_different_owner(self):
        self.registry.register("alice", ID, decision())
        self.registry.register("bob", ID, decision("quarantined", ("bad",)))
        self.assertEqual(self.registry.get("bob", ID).status, "quarantined")

    def test_duplicate_rejected(self):
        self.registry.register("alice", ID, decision())
        with self.assertRaises(ValueError):
            self.registry.register("alice", ID, decision())

    def test_quarantine_transition(self):
        self.registry.register("alice", ID, decision())
        result = self.registry.quarantine("alice", ID, "revoked")
        self.assertEqual(result.status, "quarantined")
        self.assertEqual(result.revision, 2)

    def test_history(self):
        self.registry.register("alice", ID, decision())
        self.registry.quarantine("alice", ID, "revoked")
        self.assertEqual([event["revision"] for event in self.registry.history("alice", ID)], [1, 2])

    def test_quarantine_idempotent(self):
        self.registry.register("alice", ID, decision("quarantined", ("revoked",)))
        self.registry.quarantine("alice", ID, "revoked")
        self.assertEqual(self.registry.get("alice", ID).revision, 1)

    def test_quarantine_reason_accumulates(self):
        self.registry.register("alice", ID, decision("quarantined", ("revoked",)))
        self.registry.quarantine("alice", ID, "drift")
        self.assertEqual(self.registry.get("alice", ID).reasons, ("revoked", "drift"))

    def test_missing_candidate(self):
        with self.assertRaises(KeyError):
            self.registry.get("alice", ID)

    def test_cross_owner_quarantine_blocked(self):
        self.registry.register("alice", ID, decision())
        with self.assertRaises(KeyError):
            self.registry.quarantine("bob", ID, "revoked")

    def test_release_never_authorized(self):
        self.registry.register("alice", ID, decision())
        self.assertFalse(self.registry.release_check("alice", ID)["release_authorized"])

    def test_quarantine_release_never_authorized(self):
        self.registry.register("alice", ID, decision("quarantined", ("revoked",)))
        self.assertFalse(self.registry.release_check("alice", ID)["release_authorized"])

    def test_bad_candidate_id(self):
        with self.assertRaises(ValueError):
            self.registry.register("alice", "bad", decision())

    def test_bad_owner(self):
        with self.assertRaises(ValueError):
            self.registry.register("", ID, decision())

    def test_invalid_decision(self):
        with self.assertRaises(ValueError):
            self.registry.register("alice", ID, object())

    def test_no_release_override(self):
        with self.assertRaises(ValueError):
            self.registry.register("alice", ID, CandidateQuarantineDecisionV1("pending_human_review", (), True, True, False))

    def test_no_disk_quarantine_claim(self):
        with self.assertRaises(ValueError):
            self.registry.register("alice", ID, CandidateQuarantineDecisionV1("quarantined", ("bad",), True, False, True))

    def test_pending_with_reasons_rejected(self):
        with self.assertRaises(ValueError):
            self.registry.register("alice", ID, decision("pending_human_review", ("bad",)))

    def test_quarantine_without_reason_rejected(self):
        with self.assertRaises(ValueError):
            self.registry.register("alice", ID, decision("quarantined"))

    def test_bad_reason_rejected(self):
        self.registry.register("alice", ID, decision())
        with self.assertRaises(ValueError):
            self.registry.quarantine("alice", ID, "")

    def test_history_owner_scoped(self):
        self.registry.register("alice", ID, decision())
        with self.assertRaises(KeyError):
            self.registry.history("bob", ID)

    def test_reopen_history(self):
        self.registry.register("alice", ID, decision())
        self.registry.quarantine("alice", ID, "revoked")
        self.assertEqual(len(SQLiteCandidateRegistryV1(self.path).history("alice", ID)), 2)
