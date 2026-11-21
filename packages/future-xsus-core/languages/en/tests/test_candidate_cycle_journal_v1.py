import json
import tempfile
import unittest
from pathlib import Path
from languages.en.learning.candidate_cycle_journal_v1 import (
    inspect_candidate_cycle_journal_v1 as inspect,
    record_candidate_cycle_state_v1 as record,
)


class CandidateCycleJournalV1Tests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path=Path(self.temp.name)/"report.json"
        self.rev="a"*64

    def test_absent(self):
        self.assertEqual(inspect(self.path).state,"absent")

    def test_absent_no_review(self):
        self.assertFalse(inspect(self.path).needs_review)

    def test_running(self):
        self.assertTrue(record(self.path,self.rev,"running").needs_review)

    def test_completed(self):
        record(self.path,self.rev,"running")
        self.assertFalse(record(self.path,self.rev,"completed").needs_review)

    def test_failed(self):
        self.assertTrue(record(self.path,self.rev,"failed").needs_review)

    def test_interrupted(self):
        self.assertTrue(record(self.path,self.rev,"interrupted").needs_review)

    def test_running_blocks_new_running(self):
        record(self.path,self.rev,"running")
        with self.assertRaises(RuntimeError):
            record(self.path,self.rev,"running")

    def test_revision_change_blocks_completion(self):
        record(self.path,self.rev,"running")
        with self.assertRaises(ValueError):
            record(self.path,"b"*64,"completed")

    def test_no_auto_resume(self):
        self.assertFalse(record(self.path,self.rev,"running").automatic_resume_authorized)

    def test_no_deployment(self):
        self.assertFalse(record(self.path,self.rev,"completed").production_deployment_authorized)

    def test_invalid_revision(self):
        with self.assertRaises(ValueError):
            record(self.path,"invalid","running")

    def test_invalid_state(self):
        with self.assertRaises(ValueError):
            record(self.path,self.rev,"deployed")

    def test_corrupt_json(self):
        self.path.with_name("report.json.cycle.json").write_text("{")
        with self.assertRaises(ValueError):
            inspect(self.path)

    def test_extra_fields_rejected(self):
        record(self.path,self.rev,"completed")
        p=self.path.with_name("report.json.cycle.json")
        row=json.loads(p.read_text())
        row["release_authorized"]=True
        p.write_text(json.dumps(row))
        with self.assertRaises(ValueError):
            inspect(self.path)

    def test_symlink_rejected(self):
        target=Path(self.temp.name)/"other"
        target.write_text("{}")
        self.path.with_name("report.json.cycle.json").symlink_to(target)
        with self.assertRaises(ValueError):
            inspect(self.path)

    def test_journal_exists(self):
        record(self.path,self.rev,"running")
        self.assertTrue(self.path.with_name("report.json.cycle.json").exists())

    def test_journal_private(self):
        record(self.path,self.rev,"running")
        mode=self.path.with_name("report.json.cycle.json").stat().st_mode & 0o777
        self.assertEqual(mode & 0o077,0)

    def test_no_model_artifact(self):
        record(self.path,self.rev,"running")
        self.assertFalse(self.path.exists())
