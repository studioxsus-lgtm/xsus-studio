import unittest
from aiohttp.test_utils import TestClient, TestServer
from services.api.app import create_app


class IntelligenceHTTPTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        app = create_app(store=None, conversation=None,
                         owner_tokens={"alice": "test-token"},
                         intelligence_enabled=True)
        self.client = TestClient(TestServer(app))
        await self.client.start_server()
        self.headers = {"Authorization": "Bearer test-token"}
        self.payload = {"contractVersion": "1.0.0", "requestId": "r1",
                        "query": "done", "facts": ["start"],
                        "rules": [{"premises": ["start"], "conclusion": "done"}]}

    async def asyncTearDown(self):
        await self.client.close()

    async def test_resolved(self):
        response = await self.client.post("/v1/intelligence/reason",
                                          json=self.payload, headers=self.headers)
        self.assertEqual(response.status, 200)
        result = await response.json()
        self.assertEqual(result["answer"], "done")
        self.assertFalse(result["executionAuthorized"])
        self.assertEqual(response.headers["Cache-Control"], "no-store")

    async def test_unauthorized(self):
        response = await self.client.post("/v1/intelligence/reason", json=self.payload)
        self.assertEqual(response.status, 401)

    async def test_owner_override(self):
        response = await self.client.post("/v1/intelligence/reason",
            json=dict(self.payload, ownerId="bob"), headers=self.headers)
        self.assertEqual(response.status, 400)

    async def test_unknown(self):
        response = await self.client.post("/v1/intelligence/reason",
            json=dict(self.payload, query="unknown"), headers=self.headers)
        self.assertEqual(response.status, 200)
        self.assertEqual((await response.json())["status"], "abstained")

    async def test_disabled_by_default(self):
        async with TestClient(TestServer(create_app(store=None, conversation=None,
                owner_tokens={"alice": "test-token"}))) as client:
            response = await client.post("/v1/intelligence/reason",
                                         json=self.payload, headers=self.headers)
            self.assertEqual(response.status, 404)
