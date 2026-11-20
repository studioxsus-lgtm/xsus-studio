"""Crash-boundary tests for local SQLite V6 leases; temporary files only."""
import json
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from languages.en.integration.sqlite_lease_store_v6 import SQLiteLeaseStoreV6

ROOT = Path(__file__).resolve().parents[3]
CHILD = """
import os, sqlite3, sys
from datetime import datetime, timedelta, timezone
from languages.en.integration.sqlite_lease_store_v6 import SQLiteLeaseStoreV6
path, mode = sys.argv[1:]
now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
expiry = now + timedelta(seconds=10)
key = ("crash", "request")
if mode == "committed":
    SQLiteLeaseStoreV6(path).reserve(key, now=now, expires_at=expiry)
    os._exit(29)
if mode == "uncommitted":
    SQLiteLeaseStoreV6(path)
    db = sqlite3.connect(path, isolation_level=None)
    db.execute("BEGIN IMMEDIATE")
    db.execute("INSERT INTO leases_v6 VALUES (?, ?, ?, ?)",
               ("crash", "request", "uncommitted", 9999999999999999))
    os._exit(31)
if mode == "released":
    store = SQLiteLeaseStoreV6(path)
    status, token = store.reserve(key, now=now, expires_at=expiry)
    assert status == "reserved"
    assert store.release(key, token=token)
    os._exit(37)
raise ValueError("unknown mode")
"""


class SQLiteCrashRecoveryV6Tests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.path = str(Path(temp.name) / "crash.db")
        self.now = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        self.expiry = self.now + timedelta(seconds=10)
        self.key = ("crash", "request")

    def child(self, mode):
        return subprocess.run([sys.executable, "-c", CHILD, self.path, mode],
                              cwd=str(ROOT), capture_output=True, text=True,
                              timeout=20, check=False)

    def test_committed_reservation_survives_abrupt_exit(self):
        self.assertEqual(self.child("committed").returncode, 29)
        self.assertEqual(SQLiteLeaseStoreV6(self.path).reserve(
            self.key, now=self.now, expires_at=self.expiry)[0], "duplicate")

    def test_uncommitted_reservation_is_rolled_back(self):
        result = self.child("uncommitted")
        self.assertEqual(result.returncode, 31, result.stderr)
        self.assertEqual(SQLiteLeaseStoreV6(self.path).reserve(
            self.key, now=self.now, expires_at=self.expiry)[0], "reserved")

    def test_committed_release_survives_abrupt_exit(self):
        self.assertEqual(self.child("released").returncode, 37)
        self.assertEqual(SQLiteLeaseStoreV6(self.path).reserve(
            self.key, now=self.now, expires_at=self.expiry)[0], "reserved")

    def test_reopen_after_crash_remains_usable(self):
        self.assertEqual(self.child("uncommitted").returncode, 31)
        store = SQLiteLeaseStoreV6(self.path)
        status, token = store.reserve(self.key, now=self.now, expires_at=self.expiry)
        self.assertEqual(status, "reserved")
        self.assertTrue(store.release(self.key, token=token))

    def test_expired_committed_lease_reclaimable(self):
        self.assertEqual(self.child("committed").returncode, 29)
        later = self.expiry + timedelta(seconds=1)
        self.assertEqual(SQLiteLeaseStoreV6(self.path).reserve(
            self.key, now=later, expires_at=later + timedelta(seconds=10))[0],
            "reserved")
