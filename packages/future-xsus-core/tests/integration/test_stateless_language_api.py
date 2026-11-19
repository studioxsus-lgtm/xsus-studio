import unittest
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock

from aiohttp.test_utils import TestClient, TestServer

from core.sessions.session_store import InMemorySessionStore
from core.conversation.session_conversation import SessionConversation
from services.api.app import create_app

ALICE = {"Authorization": "Bearer alice-test-token"}


@asynccontextmanager
async def _client(store, **options):
    app = create_app(
        store=store,
        conversation=AsyncMock(spec=SessionConversation),
        owner_tokens={"alice": "alice-test-token"},
        **options,
    )
    async with TestClient(TestServer(app)) as client:
        yield client


class StatelessLanguageAPITests(unittest.IsolatedAsyncioTestCase):
    async def test_proofreading_is_authenticated_and_does_not_create_a_session(self):
        store = InMemorySessionStore()
        async with _client(store) as client:
            async with client.post("/v1/language/proofread", json={"text": "They writes."}) as response:
                self.assertEqual(response.status, 401)

            async with client.post(
                "/v1/language/proofread", headers=ALICE, json={"text": "They writes."},
            ) as response:
                payload = await response.json()
                self.assertEqual(response.status, 200)
                self.assertEqual(payload, {
                    "language": "en",
                    "status": "corrected",
                    "text": "They write.",
                    "review_required": False,
                    "persisted": False,
                })
                self.assertEqual(response.headers["Cache-Control"], "no-store")

            self.assertEqual(store.list_sessions("alice").sessions, ())

    async def test_proofreading_rejects_extra_fields_and_unsupported_languages(self):
        async with _client(InMemorySessionStore()) as client:
            for payload, expected in (
                ({"text": "They writes.", "owner": "bob"}, 400),
                ({"text": "They writes.", "language": "fr"}, 422),
                ({"text": "  "}, 400),
            ):
                async with client.post("/v1/language/proofread", headers=ALICE, json=payload) as response:
                    self.assertEqual(response.status, expected)


if __name__ == "__main__":
    unittest.main()
