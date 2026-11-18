import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

from core.sessions.session_store import InMemorySessionStore, SessionPage, SessionSummary
from core.sessions.sqlite_store import SQLiteSessionStore


class SessionCatalogTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self._path = Path(directory.name) / "sessions.sqlite"

    def test_catalog_pages_are_ordered_owner_scoped_and_metadata_only(self):
        for store in (InMemorySessionStore(), SQLiteSessionStore(self._path)):
            with self.subTest(store=type(store).__name__):
                alice_ids = sorted(store.create("alice").session_id for _ in range(5))
                bob = store.create("bob")
                store.append_exchange(
                    "alice", alice_ids[0], expected_revision=0,
                    user_text="Private message", assistant_text="Private response",
                )

                first = store.list_sessions("alice", limit=2)
                self.assertEqual(first, SessionPage((
                    SessionSummary(alice_ids[0], 1), SessionSummary(alice_ids[1], 0),
                ), alice_ids[1]))

                store.delete("alice", alice_ids[1])
                second = store.list_sessions("alice", limit=2, after=first.next_cursor)
                self.assertEqual(second, SessionPage(tuple(
                    SessionSummary(session_id, 0) for session_id in alice_ids[2:4]
                ), alice_ids[3]))
                self.assertEqual(
                    store.list_sessions("alice", limit=2, after=second.next_cursor),
                    SessionPage((SessionSummary(alice_ids[4], 0),), None),
                )
                self.assertEqual(store.list_sessions("bob"), SessionPage((
                    SessionSummary(bob.session_id, 0),
                ), None))
                self.assertEqual(store.list_sessions("unrecognized"), SessionPage((), None))

    def test_both_stores_reject_invalid_pagination_arguments(self):
        for store in (InMemorySessionStore(), SQLiteSessionStore(self._path)):
            for kwargs in ({"limit": 0}, {"limit": 101}, {"limit": True}, {"after": ""}, {"after": "bad cursor"}):
                with self.subTest(store=type(store).__name__, kwargs=kwargs), self.assertRaises(ValueError):
                    store.list_sessions("alice", **kwargs)

    def test_sqlite_catalog_survives_restart_and_does_not_parse_history(self):
        store = SQLiteSessionStore(self._path)
        session = store.create("alice")
        with closing(sqlite3.connect(self._path)) as connection, connection:
            connection.execute(
                "UPDATE xsus_sessions_v1 SET history = ? WHERE session_id = ?", ("legacy text", session.session_id),
            )
        reopened = SQLiteSessionStore(self._path)
        self.assertEqual(reopened.list_sessions("alice"), SessionPage((
            SessionSummary(session.session_id, 0),
        ), None))
