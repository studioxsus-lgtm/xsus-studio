"""Integration coverage for real Supabase-user authentication boundaries."""

import unittest
from unittest.mock import AsyncMock

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

from core.conversation.session_conversation import SessionConversation
from core.sessions.session_store import InMemorySessionStore
from services.api.app import create_app
from services.api.identity.supabase import SupabaseUserAuthenticator

_PUBLISHABLE_KEY = "test-publishable-key"
_USER_A = "11111111-1111-4111-8111-111111111111"
_USER_B = "22222222-2222-4222-8222-222222222222"


class SupabaseIdentityTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.observed_api_keys = []

        async def user(request):
            self.observed_api_keys.append(request.headers.get("apikey"))
            token = request.headers.get("Authorization", "")
            if token == "Bearer unavailable-token":
                return web.json_response({"error": "temporary"}, status=503)
            identities = {
                "Bearer user-a-token": _USER_A,
                "Bearer user-b-token": _USER_B,
            }
            user_id = identities.get(token)
            if user_id is None:
                return web.json_response({"message": "invalid token"}, status=401)
            return web.json_response({"id": user_id, "email": "private@example.test"})

        auth_app = web.Application()
        auth_app.router.add_get("/auth/v1/user", user)
        self.auth_server = TestServer(auth_app)
        await self.auth_server.start_server()

        authenticator = SupabaseUserAuthenticator(
            str(self.auth_server.make_url("/")).rstrip("/"), _PUBLISHABLE_KEY,
        )
        self.app_client = TestClient(TestServer(create_app(
            store=InMemorySessionStore(),
            conversation=AsyncMock(spec=SessionConversation),
            owner_authenticator=authenticator,
        )))
        await self.app_client.start_server()

    async def asyncTearDown(self):
        await self.app_client.close()
        await self.auth_server.close()

    async def test_user_tokens_map_to_separate_private_session_owners(self):
        async with self.app_client.post(
            "/v1/sessions", headers={"Authorization": "Bearer user-a-token"},
        ) as response:
            self.assertEqual(response.status, 201)
            session = await response.json()
        session_url = f"/v1/sessions/{session['session_id']}"

        async with self.app_client.get(
            session_url, headers={"Authorization": "Bearer user-a-token"},
        ) as response:
            self.assertEqual(response.status, 200)

        async with self.app_client.get(
            session_url, headers={"Authorization": "Bearer user-b-token"},
        ) as response:
            self.assertEqual(response.status, 404)

        self.assertTrue(self.observed_api_keys)
        self.assertEqual(set(self.observed_api_keys), {_PUBLISHABLE_KEY})

    async def test_invalid_tokens_are_unauthorized_and_auth_outage_is_service_unavailable(self):
        for token in ("unknown-token", "token with spaces"):
            async with self.app_client.post(
                "/v1/sessions", headers={"Authorization": f"Bearer {token}"},
            ) as response:
                self.assertEqual(response.status, 401)

        async with self.app_client.post(
            "/v1/sessions", headers={"Authorization": "Bearer unavailable-token"},
        ) as response:
            self.assertEqual(response.status, 503)
            payload = await response.json()
            self.assertEqual(payload["error"]["code"], "identity_provider_unavailable")

    async def test_authenticator_rejects_insecure_remote_project_urls(self):
        with self.assertRaises(ValueError):
            SupabaseUserAuthenticator("http://auth.example.test", _PUBLISHABLE_KEY)


if __name__ == "__main__":
    unittest.main()
