import asyncio
import unittest
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock

from aiohttp.test_utils import TestClient, TestServer

from core.contracts.common import LanguageTag
from core.contracts.errors import EngineError, ErrorCode
from core.contracts.response import EngineResponse, TextResult
from core.conversation.session_conversation import SessionConversation
from core.sessions.session_store import InMemorySessionStore, SessionRevisionError
from languages.en.engine.english_engine import create_engine
from services.api.app import create_app

ALICE = {"Authorization": "Bearer alice-test-token"}
BOB = {"Authorization": "Bearer bob-test-token"}


@asynccontextmanager
async def _client(store, conversation, **options):
    app = create_app(
        store=store, conversation=conversation,
        owner_tokens={"alice": "alice-test-token", "bob": "bob-test-token"},
        **options,
    )
    async with TestClient(TestServer(app)) as client:
        yield client


async def _create(client):
    async with client.post("/v1/sessions", headers=ALICE) as response:
        location = response.headers["Location"]
        return response.status, await response.json(), location


class ConversationAPITests(unittest.IsolatedAsyncioTestCase):
    async def test_lifecycle_and_owner_isolation(self):
        store = InMemorySessionStore()
        instance = create_engine().instance

        async def reply(request):
            return EngineResponse(request.request_id, request.attempt_id, instance, TextResult("Hello.", request.language))

        async with _client(store, SessionConversation(AsyncMock(execute=reply), store)) as client:
            status, snapshot, location = await _create(client)
            self.assertEqual(status, 201)
            self.assertEqual(snapshot, {"session_id": location.split("/")[-1], "revision": 0, "history": []})
            for method, path, extra in (
                ("GET", location, {}),
                ("DELETE", location, {}),
                ("POST", location + "/messages", {"json": {"text": "Hello"}}),
            ):
                with self.subTest(method=method):
                    async with client.request(method, path, headers=BOB, **extra) as response:
                        self.assertEqual(response.status, 404)
            async with client.post(location + "/messages", headers=ALICE, json={"text": "Hi."}) as response:
                self.assertEqual(response.status, 200)
                self.assertEqual(response.headers["Cache-Control"], "no-store")
                message = await response.json()
                self.assertEqual((message["text"], message["language"]), ("Hello.", "en"))
                self.assertEqual(message["session_id"], snapshot["session_id"])
            async with client.get(location, headers=ALICE) as response:
                saved = await response.json()
                self.assertEqual(saved["revision"], 1)
                self.assertEqual(saved["history"], [{"role": "user", "text": "Hi."}, {"role": "assistant", "text": "Hello."}])
            async with client.delete(location, headers=ALICE) as response:
                self.assertEqual(response.status, 204)
            async with client.get(location, headers=ALICE) as response:
                self.assertEqual(response.status, 404)

    async def test_authentication_and_message_validation(self):
        store = InMemorySessionStore()
        conversation = AsyncMock(spec=SessionConversation)
        async with _client(store, conversation, supported_languages=frozenset({LanguageTag("en")})) as client:
            async with client.post("/v1/sessions") as response:
                self.assertEqual(response.status, 401)
                self.assertEqual(response.headers["WWW-Authenticate"], "Bearer")
            async with client.get("/healthz") as response:
                self.assertEqual(await response.json(), {"status": "ok"})
            async with client.post("/v1/sessions", headers=ALICE, json={"owner": "bob"}) as response:
                self.assertEqual(response.status, 400)
            _, _, location = await _create(client)
            cases = (
                (400, {"json": {"text": "hello", "owner": "bob"}}),
                (400, {"json": {"text": "a" * 4_097}}),
                (400, {"json": {"text": "hello", "language": "wrong_tag"}}),
                (422, {"json": {"text": "hello", "language": "fr"}}),
                (400, {"json": {"text": "\ud800"}}),
                (400, {"data": b"{", "headers": {"Content-Type": "application/json"}}),
                (415, {"data": "text"}),
                (413, {"json": {"text": "a" * (32 * 1024)}}),
            )
            for expected, params in cases:
                headers = {**ALICE, **params.get("headers", {})}
                params = {**params, "headers": headers}
                with self.subTest(expected=expected):
                    async with client.post(location + "/messages", **params) as response:
                        self.assertEqual(response.status, expected)
            conversation.execute.assert_not_called()

    async def test_engine_failures_and_session_conflicts_are_mapped(self):
        store = InMemorySessionStore()
        conversation = AsyncMock(spec=SessionConversation)
        conversation.execute.side_effect = [
            EngineError(ErrorCode.DEADLINE_EXCEEDED, "private engine detail"),
            SessionRevisionError("conflict"),
        ]
        async with _client(store, conversation) as client:
            _, _, location = await _create(client)
            for status, code in ((504, "deadline_exceeded"), (409, "session_conflict")):
                async with client.post(location + "/messages", headers=ALICE, json={"text": "Hi"}) as response:
                    self.assertEqual(response.status, status)
                    payload = await response.json()
                    self.assertEqual(payload["error"]["code"], code)
                    self.assertNotIn("private engine detail", payload["error"]["message"])

    async def test_excess_concurrency_is_rejected_and_slot_is_released(self):
        store = InMemorySessionStore()
        entered = asyncio.Event()
        release = asyncio.Event()

        async def execute(*args, **kwargs):
            entered.set()
            await release.wait()
            return EngineError(ErrorCode.INTERNAL, "test")

        conversation = AsyncMock(spec=SessionConversation)
        conversation.execute.side_effect = execute
        async with _client(store, conversation, max_concurrent_messages=1) as client:
            _, _, location = await _create(client)
            url = location + "/messages"
            first = asyncio.create_task(self._status(client, url))
            try:
                await asyncio.wait_for(entered.wait(), 2)
                self.assertEqual(await self._status(client, url), (503, "message_capacity"))
            finally:
                release.set()
                await first
            self.assertEqual(await self._status(client, url), (502, "internal"))

    @staticmethod
    async def _status(client, url):
        async with client.post(url, headers=ALICE, json={"text": "Hi"}) as response:
            return response.status, (await response.json())["error"]["code"]
