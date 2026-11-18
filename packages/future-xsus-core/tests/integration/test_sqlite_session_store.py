"""The durable backend shares the session contract across processes and writers."""

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
from threading import Barrier
import unittest

from core.sessions.session_store import (
    SessionCapacityError,
    SessionNotFoundError,
    SessionRevisionError,
)
from core.sessions.sqlite_store import SQLiteSessionStore


class SQLiteSessionStoreTest(unittest.TestCase):
    def setUp(self):
        directory = self.enterContext(TemporaryDirectory())
        self.database = Path(directory) / "sessions.sqlite3"

    def test_history_survives_an_independent_python_process(self):
        store = SQLiteSessionStore(self.database)
        session = store.create("alice")
        script = """
import sys
from core.sessions.sqlite_store import SQLiteSessionStore

store = SQLiteSessionStore(sys.argv[1])
store.append_exchange(
    "alice", sys.argv[2], expected_revision=0,
    user_text="Përshëndetje", assistant_text="Mirë se erdhe",
)
"""
        subprocess.run(
            [sys.executable, "-c", script, str(self.database), session.session_id],
            check=True,
            cwd=Path(__file__).resolve().parents[2],
            timeout=10,
        )
        reopened = SQLiteSessionStore(self.database).get("alice", session.session_id)
        self.assertEqual(reopened.revision, 1)
        self.assertEqual(
            [(turn.role.value, turn.text) for turn in reopened.conversation("Vazhdo").history],
            [("user", "Përshëndetje"), ("assistant", "Mirë se erdhe")],
        )

    def test_owner_scope_and_delete_hold_across_instances(self):
        store = SQLiteSessionStore(self.database, max_sessions=1)
        session = store.create("alice")
        other = SQLiteSessionStore(self.database, max_sessions=1)
        with self.assertRaises(SessionNotFoundError):
            other.get("bob", session.session_id)
        with self.assertRaises(SessionNotFoundError):
            other.delete("bob", session.session_id)
        with self.assertRaises(SessionNotFoundError):
            other.append_exchange(
                "bob", session.session_id, expected_revision=0, user_text="U", assistant_text="A",
            )
        with self.assertRaises(SessionCapacityError):
            other.create("bob")

        other.delete("alice", session.session_id)
        with self.assertRaises(SessionNotFoundError):
            store.get("alice", session.session_id)
        self.assertNotEqual(store.create("bob").session_id, session.session_id)

    def test_persistent_limits_prune_exchanges_and_reject_oversize_atomically(self):
        options = {"max_exchanges": 2, "max_history_chars": 6}
        store = SQLiteSessionStore(self.database, **options)
        session = store.create("alice")
        for user_text, assistant_text in (("u1", "a1"), ("u2", "a2"), ("u3", "a3")):
            session = store.append_exchange(
                "alice", session.session_id, expected_revision=session.revision,
                user_text=user_text, assistant_text=assistant_text,
            )
        reopened = SQLiteSessionStore(self.database, **options)
        self.assertEqual(tuple(turn.text for turn in session.history), ("u3", "a3"))
        with self.assertRaises(ValueError):
            reopened.append_exchange(
                "alice", session.session_id, expected_revision=session.revision,
                user_text="over", assistant_text="limit",
            )
        self.assertEqual(reopened.get("alice", session.session_id), session)
        with self.assertRaisesRegex(ValueError, "limits must match"):
            SQLiteSessionStore(self.database)

    def test_concurrent_writers_use_one_revision_once(self):
        stores = (SQLiteSessionStore(self.database), SQLiteSessionStore(self.database))
        session = stores[0].create("alice")
        ready = Barrier(2, timeout=5)

        def append(index):
            ready.wait()
            try:
                return stores[index].append_exchange(
                    "alice", session.session_id, expected_revision=session.revision,
                    user_text=f"Question {index}", assistant_text="Answer",
                )
            except SessionRevisionError:
                return None

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(append, (0, 1)))
        committed = [result for result in results if result is not None]
        self.assertEqual(len(committed), 1)
        self.assertEqual(committed[0].revision, 1)
        self.assertEqual(stores[1].get("alice", session.session_id), committed[0])
