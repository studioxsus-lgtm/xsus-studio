"""Cross-process bounded SQLite lease tests; local temporary files only."""
import json
import subprocess
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
CHILD = """
import json, sys
from datetime import datetime, timedelta, timezone
from languages.en.integration.sqlite_bounded_lease_store_v6 import SQLiteBoundedLeaseStoreV6
path, action, key, limit = sys.argv[1:5]
store = SQLiteBoundedLeaseStoreV6(path, max_entries=int(limit))
now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
expiry = now + timedelta(seconds=10)
if action == "reserve":
    status, token = store.reserve(("multi", key), now=now, expires_at=expiry)
    print(json.dumps({"status": status, "token": token}))
elif action == "release":
    print(json.dumps({"released": store.release(("multi", key), token=sys.argv[5])}))
elif action == "expired":
    later = expiry + timedelta(seconds=1)
    status, token = store.reserve(("multi", key), now=later,
        expires_at=later + timedelta(seconds=10))
    print(json.dumps({"status": status, "token": token}))
else:
    raise ValueError("invalid action")
"""


class SQLiteBoundedMultiprocessV6Tests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.path = str(Path(temp.name) / "bounded.db")

    def child(self, action="reserve", key="one", limit=2, token=None):
        args = [sys.executable, "-c", CHILD, self.path, action, key, str(limit)]
        if token is not None:
            args.append(token)
        result = subprocess.run(args, cwd=str(ROOT), text=True,
                                capture_output=True, timeout=25, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_two_distinct_processes_fit(self):
        self.assertEqual(self.child(key="one")["status"], "reserved")
        self.assertEqual(self.child(key="two")["status"], "reserved")

    def test_third_process_hits_capacity(self):
        self.child(key="one")
        self.child(key="two")
        self.assertEqual(self.child(key="three")["status"], "capacity")

    def test_duplicate_before_capacity(self):
        self.child(key="one")
        self.child(key="two")
        self.assertEqual(self.child(key="one")["status"], "duplicate")

    def test_owner_release_frees_capacity_across_processes(self):
        first = self.child(key="one")
        self.child(key="two")
        self.assertTrue(self.child(action="release", key="one",
                                   token=first["token"])["released"])
        self.assertEqual(self.child(key="three")["status"], "reserved")

    def test_wrong_owner_does_not_free_capacity(self):
        self.child(key="one")
        self.child(key="two")
        self.assertFalse(self.child(action="release", key="one",
                                    token="wrong")["released"])
        self.assertEqual(self.child(key="three")["status"], "capacity")

    def test_expiry_reclaims_capacity_across_processes(self):
        self.child(key="one")
        self.child(key="two")
        self.assertEqual(self.child(action="expired", key="three")["status"],
                         "reserved")

    def test_parallel_processes_observe_global_capacity(self):
        with ThreadPoolExecutor(max_workers=6) as pool:
            results = list(pool.map(lambda i: self.child(key=str(i)), range(6)))
        self.assertEqual(sum(r["status"] == "reserved" for r in results), 2)
        self.assertEqual(sum(r["status"] == "capacity" for r in results), 4)

    def test_reopen_does_not_reset_capacity(self):
        self.child(key="one")
        self.child(key="two")
        for i in range(3):
            self.assertEqual(self.child(key=f"extra-{i}")["status"], "capacity")
