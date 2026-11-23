"""Phase 16 integration checks for the opt-in Albanian HTTP route."""
import unittest
from aiohttp.test_utils import TestClient, TestServer
from aiohttp import web
from services.api.app import create_app

class _DummyStore:
    pass

class _DummyConversation:
    pass

class AlbanianAPIIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.token = "a" * 40
        self.app = create_app(
            store=_DummyStore(),
            conversation=_DummyConversation(),
            owner_tokens={"test-owner": self.token},
            albanian_analysis_enabled=True,
        )
        self.client = TestClient(TestServer(self.app))
        await self.client.start_server()

    async def asyncTearDown(self):
        await self.client.close()

    async def _post(self, payload, token=None):
        return await self.client.post(
            "/v1/language/analyze/sq", json=payload,
            headers={"Authorization": "Bearer " + (token or self.token)},
        )

    async def test_authorized_analysis(self):
        response = await self._post({"text": "Unë jam.", "language": "sq"})
        self.assertEqual(response.status, 200)
        body = await response.json()
        self.assertEqual(body["language"], "sq")
        self.assertFalse(body["persisted"])
        self.assertTrue(body["quality"]["syntax_supported"])

    async def test_rejects_unsupported_language(self):
        response = await self._post({"text": "Hello", "language": "en"})
        self.assertEqual(response.status, 422)

    async def test_rejects_missing_fields(self):
        response = await self._post({"text": "Unë jam."})
        self.assertEqual(response.status, 400)

    async def test_rejects_invalid_token(self):
        response = await self._post({"text": "Unë jam.", "language": "sq"}, token="wrong")
        self.assertEqual(response.status, 401)

    async def test_rejects_duplicate_json_keys(self):
        response = await self.client.post(
            "/v1/language/analyze/sq",
            data='{"text":"Unë jam.","text":"Ti je.","language":"sq"}',
            headers={"Authorization": "Bearer " + self.token, "Content-Type": "application/json"},
        )
        self.assertEqual(response.status, 400)

    async def test_default_disabled(self):
        app = create_app(
            store=_DummyStore(), conversation=_DummyConversation(),
            owner_tokens={"test-owner": self.token},
        )
        async with TestClient(TestServer(app)) as client:
            response = await client.post(
                "/v1/language/analyze/sq",
                json={"text": "Unë jam.", "language": "sq"},
                headers={"Authorization": "Bearer " + self.token},
            )
            self.assertEqual(response.status, 404)

if __name__ == "__main__":
    unittest.main()
