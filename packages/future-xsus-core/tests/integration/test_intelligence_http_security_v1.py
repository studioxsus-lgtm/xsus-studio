import json
import unittest
from aiohttp.test_utils import TestClient, TestServer
from services.api.app import create_app


class IntelligenceSecurityTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.client = TestClient(TestServer(create_app(
            store=None, conversation=None, owner_tokens={"alice": "token-a"},
            intelligence_enabled=True, allowed_origins=frozenset({"https://example.com"}))))
        await self.client.start_server()
        self.headers = {"Authorization": "Bearer token-a", "Content-Type": "application/json"}
        self.path = "/v1/intelligence/reason"
        self.payload = {"contractVersion": "1.0.0", "requestId": "security",
                        "query": "done", "facts": ["done"], "rules": []}

    async def asyncTearDown(self):
        await self.client.close()

    async def test_duplicate_fields(self):
        body = json.dumps(self.payload)[:-1] + ', "query": "other"}'
        response = await self.client.post(self.path, data=body, headers=self.headers)
        self.assertEqual(response.status, 400)

    async def test_nonfinite_constant(self):
        body = json.dumps(dict(self.payload, facts=[float("nan")]))
        response = await self.client.post(self.path, data=body, headers=self.headers)
        self.assertEqual(response.status, 400)

    async def test_nested_duplicate_fields(self):
        body = json.dumps(self.payload).replace('"rules": []',
            '"rules": [{"premises":["done"],"conclusion":"done","conclusion":"other"}]')
        response = await self.client.post(self.path, data=body, headers=self.headers)
        self.assertEqual(response.status, 400)

    async def test_body_limit(self):
        response = await self.client.post(self.path, data=" " * 33000, headers=self.headers)
        self.assertEqual(response.status, 413)

    async def test_origin_denied(self):
        response = await self.client.post(self.path, json=self.payload,
            headers=dict(self.headers, Origin="https://evil.example"))
        self.assertEqual(response.status, 403)

    async def test_duplicate_authorization(self):
        response = await self.client.post(self.path, json=self.payload,
            headers=[("Authorization", "Bearer token-a"), ("Authorization", "Bearer other")])
        self.assertEqual(response.status, 401)

    async def test_no_execution_override(self):
        response = await self.client.post(self.path,
            json=dict(self.payload, executionAuthorized=True), headers=self.headers)
        self.assertEqual(response.status, 400)

    async def test_recovery_after_invalid_input(self):
        response = await self.client.post(self.path, data="{", headers=self.headers)
        self.assertEqual(response.status, 400)
        response = await self.client.post(self.path, json=self.payload, headers=self.headers)
        self.assertEqual(response.status, 200)
        self.assertFalse((await response.json())["executionAuthorized"])
