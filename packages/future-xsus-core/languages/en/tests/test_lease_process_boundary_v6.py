"""Process-boundary checks for the in-memory V6 reference lease store.

These tests intentionally demonstrate non-durability; no distributed recovery
claim is made. Child processes are isolated from production services.
"""
import json
import os
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
CHILD = """
import json, os, sys
from datetime import datetime, timedelta, timezone
from languages.en.integration.owned_replay_store_v6 import OwnedReplayStoreV6
store = OwnedReplayStoreV6(max_entries=2)
now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
key = ("process", "request")
status, token = store.reserve(key, now=now, expires_at=now + timedelta(seconds=10))
if sys.argv[1] == "crash":
    os._exit(23)
print(json.dumps({"status": status, "token_created": bool(token),
                  "duplicate": store.reserve(key, now=now,
                      expires_at=now + timedelta(seconds=10))[0]}))
"""


class LeaseProcessBoundaryV6Tests(unittest.TestCase):
    def child(self, mode="normal"):
        return subprocess.run([sys.executable, "-c", CHILD, mode],
                              cwd=str(ROOT), capture_output=True, text=True,
                              timeout=15, check=False)

    def test_child_can_reserve(self):
        result = self.child()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["status"], "reserved")

    def test_child_duplicate_rejected(self):
        result = self.child()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["duplicate"], "duplicate")

    def test_abrupt_exit_is_observable(self):
        result = self.child("crash")
        self.assertEqual(result.returncode, 23)
        self.assertEqual(result.stdout, "")

    def test_new_process_has_no_previous_lease(self):
        first = self.child()
        second = self.child()
        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertEqual(json.loads(first.stdout)["status"], "reserved")
        self.assertEqual(json.loads(second.stdout)["status"], "reserved")

    def test_crash_does_not_preserve_lease(self):
        crashed = self.child("crash")
        restarted = self.child()
        self.assertEqual(crashed.returncode, 23)
        self.assertEqual(restarted.returncode, 0, restarted.stderr)
        self.assertEqual(json.loads(restarted.stdout)["status"], "reserved")

    def test_multiple_independent_processes(self):
        results = [self.child() for _ in range(3)]
        self.assertTrue(all(result.returncode == 0 for result in results))
        self.assertTrue(all(json.loads(result.stdout)["token_created"]
                            for result in results))
