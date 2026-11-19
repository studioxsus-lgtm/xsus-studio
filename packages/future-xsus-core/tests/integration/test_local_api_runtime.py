import os
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from aiohttp.test_utils import TestClient, TestServer

from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.learning.worker import run_once
from languages.en.models.checkpoint import save_checkpoint
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.models.registry import EnglishModelRegistry
from languages.en.text.tokenizer import BytePairTokenizer
from services.api.server import create_local_app

_TOKEN = "local-test-token-with-at-least-32-chars"
_HEADERS = {"Authorization": f"Bearer {_TOKEN}"}


class LocalAPIRuntimeTests(unittest.IsolatedAsyncioTestCase):
    async def test_consented_api_feedback_flows_into_a_separate_learning_candidate(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            database = root / "conversation.db"
            async with TestClient(TestServer(create_local_app(database, owner="test-owner", token=_TOKEN))) as client:
                example_ids = []
                for index in range(5):
                    submitted = await client.post("/v1/learning/feedback", headers=_HEADERS, json={
                        "consent": True,
                        "prompt": f"Private end-to-end worker prompt {index}",
                        "response": f"A distinct reviewed end-to-end answer {index}.",
                    })
                    self.assertEqual(submitted.status, 202)
                    record = await submitted.json()
                    example_ids.append(record["example_id"])
                for example_id in example_ids:
                    reviewed = await client.post(
                        f"/v1/learning/feedback/{example_id}/accept", headers=_HEADERS,
                    )
                    self.assertEqual((await reviewed.json())["status"], "accepted")

            feedback = SQLiteFeedbackStore(root / "conversation.feedback.sqlite3")
            self.assertEqual(len(feedback.accepted("test-owner")), 5)
            baseline = root / "small-baseline.json.gz"
            tokenizer = BytePairTokenizer()
            model = NeuralLanguageModel.initialize(
                vocab_size=tokenizer.vocab_size, hidden_size=4, context_size=16, seed=83,
            )
            save_checkpoint(baseline, tokenizer, model)
            registry = EnglishModelRegistry(root / "registry")
            benchmark_scores = {"cases": 1, "accepted": 1, "preserved_all_facts": 1}
            with patch("languages.en.learning.worker._DEFAULT_BASELINE", baseline), \
                 patch("languages.en.learning.continual.compare_checkpoint", return_value=benchmark_scores):
                candidate = run_once(
                    store=feedback, owner_id="test-owner", registry=registry,
                    output_dir=root / "candidates", replay_examples=8,
                )
            self.assertIn(candidate["status"], {"candidate_ready", "candidate_blocked"})
            self.assertTrue(Path(candidate["candidate"]).is_file())
            self.assertTrue(Path(candidate["report"]).is_file())
            self.assertIsNone(EnglishModelRegistry(Path(candidate["registry"])).active())

    async def test_learning_feedback_is_available_and_persists_after_restart(self):
        with TemporaryDirectory() as directory:
            database = Path(directory) / "conversation.db"
            payload = {
                "consent": True,
                "prompt": "Explain a clear sentence.",
                "response": "It expresses a complete thought.",
            }
            async with TestClient(TestServer(create_local_app(database, owner="test-owner", token=_TOKEN))) as client:
                submitted = await client.post("/v1/learning/feedback", headers=_HEADERS, json=payload)
                self.assertEqual(submitted.status, 202)
                record = await submitted.json()
                self.assertEqual(record["status"], "pending")

            async with TestClient(TestServer(create_local_app(database, owner="test-owner", token=_TOKEN))) as client:
                pending = await client.get("/v1/learning/feedback", headers=_HEADERS)
                self.assertEqual((await pending.json())["pending"], [record["example_id"]])
                reviewed = await client.post(
                    f"/v1/learning/feedback/{record['example_id']}/accept", headers=_HEADERS,
                )
                self.assertEqual((await reviewed.json())["status"], "accepted")

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
                listed = await client.get("/v1/sessions", headers=_HEADERS)
                self.assertEqual(listed.status, 200)
                self.assertEqual((await listed.json())["sessions"], [{"session_id": session_id, "revision": 1}])
                second = await client.post(endpoint, headers=_HEADERS, json={
                    "text": "Can you say it in fewer words?", "expected_revision": 1,
                })
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
