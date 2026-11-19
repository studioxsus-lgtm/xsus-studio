import asyncio
import unittest
from contextlib import asynccontextmanager
from tempfile import TemporaryDirectory
from pathlib import Path
from unittest.mock import AsyncMock

from aiohttp.test_utils import TestClient, TestServer

from core.contracts.common import LanguageTag
from core.contracts.errors import EngineError, ErrorCode
from core.contracts.response import EngineResponse, TextResult
from core.conversation.session_conversation import SessionConversation
from core.sessions.session_store import InMemorySessionStore, SessionRevisionError
from languages.en.engine.english_engine import create_engine
from languages.en.learning.feedback_store import SQLiteFeedbackStore
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
    async def test_browser_cors_allows_only_configured_origins_and_headers(self):
        allowed_origin = "https://www.xsusstudio.com"
        async with _client(
            InMemorySessionStore(), AsyncMock(spec=SessionConversation),
            allowed_origins=frozenset({allowed_origin}),
        ) as client:
            async with client.options(
                "/v1/sessions",
                headers={
                    "Origin": allowed_origin,
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "authorization, content-type",
                },
            ) as response:
                self.assertEqual(response.status, 204)
                self.assertEqual(response.headers["Access-Control-Allow-Origin"], allowed_origin)
                self.assertIn("Authorization", response.headers["Access-Control-Allow-Headers"])
                self.assertIn("Origin", response.headers["Vary"])

            async with client.options(
                "/v1/sessions",
                headers={
                    "Origin": "https://attacker.example",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "authorization",
                },
            ) as response:
                self.assertEqual(response.status, 403)

            async with client.options(
                "/v1/sessions",
                headers={
                    "Origin": allowed_origin,
                    "Access-Control-Request-Method": "PUT",
                    "Access-Control-Request-Headers": "authorization",
                },
            ) as response:
                self.assertEqual(response.status, 403)

    async def test_browser_cors_rejects_insecure_remote_allowlist(self):
        with self.assertRaises(ValueError):
            create_app(
                store=InMemorySessionStore(),
                conversation=AsyncMock(spec=SessionConversation),
                owner_tokens={"alice": "alice-test-token"},
                allowed_origins=frozenset({"http://xsusstudio.com"}),
            )

    async def test_learning_feedback_requires_consent_and_is_owner_scoped(self):
        with TemporaryDirectory() as temporary:
            feedback = SQLiteFeedbackStore(Path(temporary) / "feedback.sqlite3")
            async with _client(
                InMemorySessionStore(), AsyncMock(spec=SessionConversation), feedback_store=feedback,
            ) as client:
                endpoint = "/v1/learning/feedback"
                async with client.post(endpoint, headers=ALICE, json={
                    "prompt": "Explain a clear sentence.", "response": "It expresses a complete thought.",
                }) as response:
                    self.assertEqual(response.status, 400)
                async with client.post(endpoint, headers=ALICE, json={
                    "consent": True, "prompt": "Explain a clear sentence.",
                    "response": "It expresses a complete thought.",
                }) as response:
                    self.assertEqual(response.status, 202)
                    submitted = await response.json()
                    self.assertEqual(submitted["status"], "pending")
                    self.assertEqual(response.headers["Cache-Control"], "no-store")
                example_id = submitted["example_id"]
                review_url = f"{endpoint}/{example_id}/accept"
                async with client.get(f"{endpoint}/{example_id}") as response:
                    self.assertEqual(response.status, 401)
                async with client.get(f"{endpoint}/{example_id}", headers=ALICE) as response:
                    private_example = await response.json()
                    self.assertEqual(response.status, 200)
                    self.assertEqual(private_example["prompt"], "Explain a clear sentence.")
                    self.assertEqual(private_example["response"], "It expresses a complete thought.")
                    self.assertEqual(private_example["status"], "pending")
                async with client.get(f"{endpoint}/{example_id}", headers=BOB) as response:
                    self.assertEqual(response.status, 404)
                async with client.get(endpoint, headers=BOB) as response:
                    self.assertEqual(await response.json(), {"pending": []})
                async with client.post(review_url, headers=BOB) as response:
                    self.assertEqual(response.status, 404)
                async with client.delete(f"{endpoint}/{example_id}", headers=BOB) as response:
                    self.assertEqual(response.status, 404)
                async with client.get(endpoint, headers=ALICE) as response:
                    self.assertEqual((await response.json())["pending"], [example_id])
                async with client.post(review_url, headers=ALICE) as response:
                    self.assertEqual((await response.json())["status"], "accepted")
                async with client.post(f"{endpoint}/{example_id}/reject", headers=ALICE) as response:
                    self.assertEqual(response.status, 409)
                self.assertEqual(len(feedback.accepted("alice")), 1)
                async with client.delete(f"{endpoint}/{example_id}", headers=ALICE) as response:
                    self.assertEqual(response.status, 204)
                self.assertEqual(feedback.accepted("alice"), ())

    async def test_learning_feedback_rejects_invalid_payload_and_requires_auth(self):
        with TemporaryDirectory() as temporary:
            feedback = SQLiteFeedbackStore(Path(temporary) / "feedback.sqlite3")
            async with _client(
                InMemorySessionStore(), AsyncMock(spec=SessionConversation), feedback_store=feedback,
            ) as client:
                endpoint = "/v1/learning/feedback"
                async with client.post(endpoint, json={"consent": True, "prompt": "x", "response": "y"}) as response:
                    self.assertEqual(response.status, 401)
                for payload in (
                    {"consent": False, "prompt": "x", "response": "y"},
                    {"consent": True, "prompt": "x", "response": "y", "extra": "unexpected"},
                    {"consent": True, "prompt": "x", "response": "y", "history": [{"role": "system", "text": "x"}]},
                ):
                    async with client.post(endpoint, headers=ALICE, json=payload) as response:
                        self.assertEqual(response.status, 400)
                self.assertEqual(feedback.pending_ids("alice"), ())

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

    async def test_listing_is_private_paginated_and_excludes_history(self):
        store = InMemorySessionStore()
        items = [store.create("alice") for _ in range(3)]
        first = min(items, key=lambda item: item.session_id)
        store.append_exchange(
            "alice", first.session_id, expected_revision=0,
            user_text="Private prompt", assistant_text="Private response",
        )
        store.create("bob")
        async with _client(store, AsyncMock(spec=SessionConversation)) as client:
            async with client.get("/v1/sessions") as response:
                self.assertEqual(response.status, 401)
            async with client.get("/v1/sessions?limit=1", headers=ALICE) as response:
                self.assertEqual(response.status, 200)
                self.assertEqual(response.headers["Cache-Control"], "no-store")
                self.assertEqual(await response.json(), {
                    "sessions": [{"session_id": first.session_id, "revision": 1}],
                    "next_cursor": first.session_id,
                })
            async with client.get("/v1/sessions", headers=ALICE, params={"after": first.session_id}) as response:
                page = await response.json()
                self.assertIsNone(page["next_cursor"])
                self.assertEqual(
                    [item["session_id"] for item in page["sessions"]],
                    sorted(item.session_id for item in items if item != first),
                )
            for query in ("limit=0", "limit=101", "limit=1&limit=2", "after=%20", "owner=bob"):
                with self.subTest(query=query):
                    async with client.get("/v1/sessions?" + query, headers=ALICE) as response:
                        self.assertEqual(response.status, 400)

    async def test_expected_revision_rejects_stale_requests_before_generation(self):
        store = InMemorySessionStore()
        engine = create_engine()
        executor = AsyncMock()
        executor.execute.side_effect = lambda request: EngineResponse(
            request.request_id, request.attempt_id, engine.instance, TextResult("Hello.", request.language),
        )
        async with _client(store, SessionConversation(executor, store)) as client:
            _, item, location = await _create(client)
            path = location + "/messages"
            payload = {"text": "Hi", "expected_revision": 0}
            async with client.post(path, headers=ALICE, json=payload) as response:
                self.assertEqual(response.status, 200)
            async with client.post(path, headers=ALICE, json=payload) as response:
                self.assertEqual(response.status, 409)
                self.assertEqual((await response.json())["error"]["code"], "session_conflict")
            for invalid in (None, True, -1, "1", 1.5):
                async with client.post(path, headers=ALICE, json={**payload, "expected_revision": invalid}) as response:
                    self.assertEqual(response.status, 400)
            executor.execute.assert_awaited_once()
            self.assertEqual(store.get("alice", item["session_id"]).revision, 1)

    async def test_revision_change_during_generation_prevents_stale_commit(self):
        store = InMemorySessionStore()
        engine = create_engine()
        entered = asyncio.Event()
        release = asyncio.Event()

        async def reply(request):
            entered.set()
            await release.wait()
            return EngineResponse(
                request.request_id, request.attempt_id, engine.instance,
                TextResult("Stale answer.", request.language),
            )

        async def send(client, path):
            async with client.post(path, headers=ALICE, json={"text": "Stale prompt", "expected_revision": 0}) as response:
                return response.status, (await response.json())["error"]["code"]

        async with _client(store, SessionConversation(AsyncMock(execute=reply), store)) as client:
            _, item, location = await _create(client)
            pending = asyncio.create_task(send(client, location + "/messages"))
            try:
                await asyncio.wait_for(entered.wait(), 2)
                winner = store.append_exchange(
                    "alice", item["session_id"], expected_revision=0,
                    user_text="New prompt", assistant_text="New answer",
                )
            finally:
                release.set()
                result = await pending
            self.assertEqual(result, (409, "session_conflict"))
            self.assertEqual(store.get("alice", item["session_id"]), winner)

    @staticmethod
    async def _status(client, url):
        async with client.post(url, headers=ALICE, json={"text": "Hi"}) as response:
            return response.status, (await response.json())["error"]["code"]
