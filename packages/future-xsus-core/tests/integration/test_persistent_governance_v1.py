"""Governance snapshot durability, corruption handling and recovery."""
import json
import tempfile
import unittest
from pathlib import Path
from core.intelligence.persistent_governance_v1 import PersistentGovernance
from core.intelligence.improvement_v1 import ImprovementVerdict


class PersistenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "governance.json"
        self.good = ImprovementVerdict("eligible_for_manual_review", "proposal1",
                                       1, 2, 2, (), ("fixed",), ())

    def test_save_and_restart(self):
        first = PersistentGovernance(self.path)
        first.registry.register("alice", "candidate1", self.good)
        first.registry.review("alice", "candidate1", reviewer_id="reviewer",
                              approve=True, expected_revision=0, note="Approved")
        digest = first.save()
        self.assertEqual(len(digest), 64)
        restarted = PersistentGovernance(self.path)
        record = restarted.registry.get("alice", "candidate1")
        self.assertEqual(record.status, "approved_for_release_review")
        self.assertEqual(record.revision, 1)

    def test_checksum_corruption_rejected(self):
        store = PersistentGovernance(self.path)
        store.registry.register("alice", "candidate1", self.good)
        store.save()
        envelope = json.loads(self.path.read_text())
        envelope["payload"]["records"][0]["status"] = "deployed"
        self.path.write_text(json.dumps(envelope))
        with self.assertRaises(ValueError):
            PersistentGovernance(self.path)

    def test_truncated_json_rejected(self):
        self.path.write_text('{"payload":')
        with self.assertRaises(json.JSONDecodeError):
            PersistentGovernance(self.path)

    def test_failed_reload_does_not_replace_in_memory_state(self):
        store = PersistentGovernance(self.path)
        store.registry.register("alice", "candidate1", self.good)
        store.save()
        self.path.write_text('{"payload":')
        with self.assertRaises(json.JSONDecodeError):
            store.reload()
        self.assertIsNotNone(store.registry.get("alice", "candidate1"))

    def test_no_snapshot_initializes_empty(self):
        store = PersistentGovernance(self.path)
        self.assertEqual(store.registry.list_for_owner("alice"), ())

    def test_owner_isolation_after_restart(self):
        store = PersistentGovernance(self.path)
        store.registry.register("alice", "candidate1", self.good)
        store.save()
        restarted = PersistentGovernance(self.path)
        self.assertIsNone(restarted.registry.get("bob", "candidate1"))

    def test_deterministic_snapshot_digest(self):
        store = PersistentGovernance(self.path)
        store.registry.register("alice", "candidate1", self.good)
        self.assertEqual(store.save(), store.save())


if __name__ == "__main__":
    unittest.main()
