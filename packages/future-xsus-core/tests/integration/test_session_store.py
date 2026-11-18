from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import unittest

from core.contracts.request import Conversation, ConversationRole, ConversationTurn
from core.sessions.session_store import (
    InMemorySessionStore,
    SessionCapacityError,
    SessionNotFoundError,
    SessionRevisionError,
)


def exchange(user_text: str, assistant_text: str) -> tuple[ConversationTurn, ConversationTurn]:
    return (
        ConversationTurn(ConversationRole.USER, user_text),
        ConversationTurn(ConversationRole.ASSISTANT, assistant_text),
    )


class SessionStoreTest(unittest.TestCase):
    def test_history_is_a_snapshot_compatible_with_conversation_requests(self):
        store = InMemorySessionStore()
        initial = store.create("owner")
        updated = store.append_exchange(
            "owner",
            initial.session_id,
            expected_revision=initial.revision,
            user_text="Make this shorter.",
            assistant_text="Here is a short version.",
        )

        self.assertEqual(initial.conversation("First prompt"), Conversation("First prompt"))
        self.assertEqual(updated.revision, 1)
        self.assertEqual(
            updated.conversation("Make it more formal."),
            Conversation(
                "Make it more formal.",
                exchange("Make this shorter.", "Here is a short version."),
            ),
        )

    def test_owner_scope_capacity_and_delete(self):
        store = InMemorySessionStore(max_sessions=1)
        session = store.create("alice")

        with self.assertRaises(SessionNotFoundError):
            store.get("bob", session.session_id)
        with self.assertRaises(SessionNotFoundError):
            store.delete("bob", session.session_id)
        with self.assertRaises(SessionNotFoundError):
            store.append_exchange(
                "bob", session.session_id,
                expected_revision=0, user_text="Question", assistant_text="Answer",
            )
        with self.assertRaises(SessionCapacityError):
            store.create("bob")

        store.delete("alice", session.session_id)
        new_session = store.create("alice")
        self.assertNotEqual(new_session.session_id, session.session_id)
        with self.assertRaises(SessionNotFoundError):
            store.get("alice", session.session_id)

    def test_prunes_only_whole_exchanges_at_both_limits(self):
        for max_exchanges, max_history_chars in ((2, 100), (100, 8)):
            with self.subTest(max_exchanges=max_exchanges, max_history_chars=max_history_chars):
                store = InMemorySessionStore(
                    max_exchanges=max_exchanges, max_history_chars=max_history_chars,
                )
                session = store.create("owner")
                for index in range(3):
                    session = store.append_exchange(
                        "owner", session.session_id,
                        expected_revision=session.revision, user_text=f"u{index}",
                        assistant_text=f"a{index}",
                    )
                self.assertEqual(session.history, exchange("u1", "a1") + exchange("u2", "a2"))

    def test_rejects_oversize_exchange_without_mutation(self):
        store = InMemorySessionStore(max_history_chars=4)
        session = store.create("owner")
        with self.assertRaises(ValueError):
            store.append_exchange(
                "owner", session.session_id,
                expected_revision=session.revision, user_text="ab", assistant_text="cde",
            )
        self.assertEqual(store.get("owner", session.session_id), session)

    def test_concurrent_updates_to_same_revision_have_one_winner(self):
        store = InMemorySessionStore()
        session = store.create("owner")
        ready = Barrier(2, timeout=5)

        def append(user_text: str) -> str | None:
            ready.wait()
            try:
                store.append_exchange(
                    "owner", session.session_id,
                    expected_revision=session.revision, user_text=user_text, assistant_text="Answer",
                )
            except SessionRevisionError:
                return None
            return user_text

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(append, ("First question", "Second question")))

        winners = [result for result in results if result is not None]
        self.assertEqual(len(winners), 1)
        updated = store.get("owner", session.session_id)
        self.assertEqual(updated.revision, 1)
        self.assertEqual(updated.history, exchange(winners[0], "Answer"))
