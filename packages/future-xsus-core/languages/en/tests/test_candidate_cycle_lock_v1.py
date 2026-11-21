import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from languages.en.learning.candidate_cycle_lock_v1 import exclusive_candidate_cycle_lock_v1 as lock


class CandidateCycleLockV1Tests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path=Path(self.temp.name)/"report.json"

    def test_acquires(self):
        with lock(self.path):
            self.assertTrue(self.path.with_name("report.json.cycle.lock").exists())

    def test_releases(self):
        with lock(self.path):
            pass
        with lock(self.path):
            pass

    def test_nested_lock_fails(self):
        with lock(self.path):
            with self.assertRaises(RuntimeError):
                with lock(self.path):
                    pass

    def test_lock_remains_after_release(self):
        with lock(self.path):
            pass
        self.assertTrue(self.path.with_name("report.json.cycle.lock").exists())

    def test_non_path_rejected(self):
        with self.assertRaises(ValueError):
            with lock("report.json"):
                pass

    def test_symlink_rejected(self):
        target=Path(self.temp.name)/"target"
        target.write_text("keep")
        self.path.with_name("report.json.cycle.lock").symlink_to(target)
        with self.assertRaises(OSError):
            with lock(self.path):
                pass
        self.assertEqual(target.read_text(),"keep")

    def test_directory_lock_rejected(self):
        self.path.with_name("report.json.cycle.lock").mkdir()
        with self.assertRaises((OSError,ValueError)):
            with lock(self.path):
                pass

    def test_exception_releases(self):
        with self.assertRaisesRegex(RuntimeError,"failure"):
            with lock(self.path):
                raise RuntimeError("failure")
        with lock(self.path):
            pass

    def test_permissions(self):
        with lock(self.path):
            mode=self.path.with_name("report.json.cycle.lock").stat().st_mode & 0o777
            self.assertEqual(mode & 0o077,0)

    def test_no_model_artifact_created(self):
        with lock(self.path):
            pass
        self.assertFalse(self.path.exists())
