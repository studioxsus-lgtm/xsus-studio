"""SQLite V6 cross-process persistence and atomicity tests.

Uses only temporary local files; no production services or databases.
"""
import json
import subprocess
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WORKDIR = Path(__file__).resolve().parents[3]
CHILD = """
import json, sys
from datetime import datetime, timedelta, timezone
from languages.en.integration.sqlite_lease_store_v6 import SQLiteLeaseStoreV6
store = SQLiteLeaseStoreV6(sys.argv[1])
now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
expiry = now + timedelta(seconds=10)
key = ("multi-process", "same-request")
action = sys.argv[2]
if action == "reserve":
    status, token = store.reserve(key, now=now, expires_at=expiry)
    print(json.dumps({"status": status, "token": token}))
elif action == "release":
    print(json.dumps({"released": store.release(key, token=sys.argv[3])}))
elif action == "reclaim":
    later = expiry + timedelta(seconds=1)
    status, token = store.reserve(key, now=later,
                                  expires_at=later + timedelta(seconds=10))
    print(json.dumps({"status": status, "token": token}))
else:
    raise ValueError("invalid action")
"""


class SQLiteLeaseMultiprocessV6Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = str(Path(self.tmp.name) / "leases.db")

    def child(self, action="reserve", token=None):
        args = [sys.executable, "-c", CHILD, self.path, action]
        if token is not None:
            args.append(token)
        result = subprocess.run(args, cwd=str(WORKDIR), capture_output=True,
                                text=True, timeout=20, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_reservation_persists_after_child_exit(self):
        first = self.child()
        self.assertEqual(first["status"], "reserved")
        self.assertEqual(self.child()["status"], "duplicate")

    def test_separate_process_can_release_owner_token(self):
        first = self.child()
        self.assertTrue(self.child("release", first["token"])["released"])
        self.assertEqual(self.child()["status"], "reserved")

    def test_separate_process_wrong_token_cannot_release(self):
        self.assertEqual(self.child()["status"], "reserved")
        self.assertFalse(self.child("release", "wrong-token")["released"])
        self.assertEqual(self.child()["status"], "duplicate")

    def test_expiry_reclaimed_by_new_process(self):
        first = self.child()
        second = self.child("reclaim")
        self.assertEqual(second["status"], "reserved")
        self.assertNotEqual(first["token"], second["token"])

    def test_stale_owner_cannot_release_replacement(self):
        first = self.child()
        replacement = self.child("reclaim")
        self.assertFalse(self.child("release", first["token"])["released"])
        self.assertTrue(self.child("release", replacement["token"])["released"])

    def test_concurrent_processes_only_one_wins(self):
        with ThreadPoolExecutor(max_workers=6) as pool:
            results = list(pool.map(lambda _: self.child(), range(6)))
        self.assertEqual(sum(r["status"] == "reserved" for r in results), 1)
        self.assertEqual(sum(r["status"] == "duplicate" for r in results), 5)

    def test_repeated_reopen_preserves_duplicate_protection(self):
        self.assertEqual(self.child()["status"], "reserved")
        for _ in range(4):
            self.assertEqual(self.child()["status"], "duplicate")
