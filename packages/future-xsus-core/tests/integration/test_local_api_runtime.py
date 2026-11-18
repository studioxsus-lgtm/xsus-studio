import os
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from aiohttp.test_utils import TestClient, TestServer

from services.api.server import create_local_app

_TOKEN = "local-test-token-with-at-least-32-chars"
_HEADERS = {"Authorization": f"Bearer {_TOKEN}"}


class LocalAPIRuntimeTests(unittest.IsolatedAsyncioTestCase):
    async def test_real_model_resumes_conversation_when_http_application_reopens(self):
        with TemporaryDirectory() as directory, patch.dict(os.environ, {"XSUS_EN_MODEL_PROFILE": "conversation-v3"}, clear=True):
            database = Path(directory) / "conversation.db"

            async with TestClient(TestServer(create_local_app(database, owner="test-owner", token=_TOKEN))) as client:
                health = await client.get("/healthz")
                self.assertEqual(health.status, 200)
                created = await client.post("/v1/sessions", headers=_HEADERS)
                self.assertEqual(created.status, 201)
                session_id = (await created.json())["session_id"]
                endpoint = f"/v1/sessions/{session_id}/messages"
                unsupported = await client.post(endpoint, headers=_HEADERS, json={"text": "Bonjour.", "language": "fr"})
                self.assertEqual(unsupported.status, 422)
                self.assertEqual((await unsupported.json())["error"]["code"], "unsupported_language")
                first = await client.post(endpoint, headers=_HEADERS, json={
                    "text": "Give this a warmer tone: We need the receipt by Friday at 9 a.m.",
                    "language": "en",
                })
                self.assertEqual(first.status, 200)
                self.assertEqual((await first.json())["text"], "We would appreciate receiving the receipt by Friday at 9 a.m.")

            async with TestClient(TestServer(create_local_app(database, owner="test-owner", token=_TOKEN))) as client:
                second = await client.post(endpoint, headers=_HEADERS, json={"text": "Can you say it in fewer words?"})
                self.assertEqual(second.status, 200)
                self.assertEqual((await second.json())["text"], "Please send the receipt by Friday at 9 a.m.")
                saved = await client.get(f"/v1/sessions/{session_id}", headers=_HEADERS)
                self.assertEqual(saved.status, 200)
                self.assertEqual((await saved.json())["revision"], 2)

    async def test_bad_token_configuration_does_not_create_database(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "conversation.db"
            with self.assertRaisesRegex(ValueError, "XSUS_API_TOKEN"):
                create_local_app(path, owner="test-owner", token="short")
            self.assertFalse(path.exists())
