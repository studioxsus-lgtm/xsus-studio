import hashlib
import tomllib
import unittest
from pathlib import Path
from time import time_ns

from core.contracts.common import V1
from core.contracts.request import Conversation, ConversationRole, ConversationTurn, EngineRequest
from core.contracts.response import EngineResponse, TextResult
from core.execution.local_transport import LocalEngineTransport
from core.execution.request_executor import RequestExecutor
from core.registry.engine_registry import EngineRegistry
from core.registry.instance import InstanceStatus
from core.routing.metrics import RoutingMetrics
from core.routing.request_router import RequestRouter
from languages.en.engine.english_engine import DEFAULT_CHECKPOINT, ENGLISH, EnglishEngine


class EnglishEngineIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def test_published_checkpoint_generates_a_follow_up_through_the_core(self):
        engine = EnglishEngine(DEFAULT_CHECKPOINT, "en-test")
        registry = EngineRegistry()
        registry.register_engine(engine.descriptor)
        registry.register_instance(engine.instance, status=InstanceStatus.READY)
        executor = RequestExecutor(RequestRouter(registry, RoutingMetrics()), LocalEngineTransport((engine,)))
        deadline = time_ns() // 1_000_000 + 5_000
        prompt = "Make this polite: Send me the file today."
        first = await executor.execute(EngineRequest("req-1", "try-1", V1, ENGLISH, deadline, Conversation(prompt)))
        self.assertIsInstance(first, EngineResponse)
        self.assertEqual(first.outcome, TextResult("Could you please send me the file today?", ENGLISH))
        history = (
            ConversationTurn(ConversationRole.USER, prompt),
            ConversationTurn(ConversationRole.ASSISTANT, first.outcome.text),
        )
        second = await executor.execute(
            EngineRequest("req-2", "try-2", V1, ENGLISH, deadline, Conversation("Make it shorter.", history))
        )
        self.assertIsInstance(second, EngineResponse)
        self.assertEqual(second.outcome, TextResult("Please send the file today.", ENGLISH))

    def test_checkpoint_checksum_matches_the_manifest(self):
        root = Path(__file__).resolve().parents[2] / "languages" / "en"
        with (root / "models" / "manifests" / "text.toml").open("rb") as source:
            manifest = tomllib.load(source)
        checkpoint = root / manifest["checkpoint"]
        self.assertEqual(checkpoint, DEFAULT_CHECKPOINT)
        self.assertEqual(hashlib.sha256(checkpoint.read_bytes()).hexdigest(), manifest["sha256"])

    async def test_rewrite_v2_preserves_unseen_details_in_a_follow_up(self):
        root = Path(__file__).resolve().parents[2] / "languages" / "en"
        with (root / "models" / "manifests" / "rewrite-v2.toml").open("rb") as source:
            manifest = tomllib.load(source)
        checkpoint = root / manifest["checkpoint"]
        self.assertEqual(hashlib.sha256(checkpoint.read_bytes()).hexdigest(), manifest["sha256"])
        engine = EnglishEngine(checkpoint, "en-rewrite-test")
        registry = EngineRegistry()
        registry.register_engine(engine.descriptor)
        registry.register_instance(engine.instance, status=InstanceStatus.READY)
        executor = RequestExecutor(RequestRouter(registry, RoutingMetrics()), LocalEngineTransport((engine,)))
        deadline = time_ns() // 1_000_000 + 5_000
        prompt = "Make this polite: Jamie, send the invoice by Sunday at 4:30 p.m."
        first = await executor.execute(EngineRequest("req-1", "try-1", V1, ENGLISH, deadline, Conversation(prompt)))
        self.assertIsInstance(first, EngineResponse)
        self.assertEqual(first.outcome, TextResult("Jamie, could you please send the invoice by Sunday at 4:30 p.m.?", ENGLISH))
        history = (
            ConversationTurn(ConversationRole.USER, prompt),
            ConversationTurn(ConversationRole.ASSISTANT, first.outcome.text),
        )
        second = await executor.execute(
            EngineRequest("req-2", "try-2", V1, ENGLISH, deadline, Conversation("Make it shorter.", history))
        )
        self.assertIsInstance(second, EngineResponse)
        self.assertEqual(second.outcome, TextResult("Jamie, please send the invoice by Sunday at 4:30 p.m.", ENGLISH))
