import os
import subprocess
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from core.contracts.common import LanguageTag
from core.contracts.errors import EngineError, ErrorCode
from core.conversation.session_conversation import SessionConversation
from core.execution.local_transport import LocalEngineTransport
from core.execution.request_executor import RequestExecutor
from core.registry.engine_registry import EngineRegistry
from core.routing.metrics import RoutingMetrics
from core.routing.request_router import RequestRouter
from core.sessions.session_store import InMemorySessionStore

PACKAGE_ROOT = Path(__file__).resolve().parents[2]


class FailedConversationTests(unittest.IsolatedAsyncioTestCase):
    async def test_engine_failure_leaves_session_untouched(self):
        store = InMemorySessionStore()
        session = store.create("owner")
        executor = RequestExecutor(RequestRouter(EngineRegistry(), RoutingMetrics()), LocalEngineTransport(()))
        service = SessionConversation(executor, store)
        result = await service.execute(
            "owner", session.session_id, "Hello.", language=LanguageTag("en"), deadline_unix_ms=1,
        )
        self.assertIsInstance(result, EngineError)
        self.assertEqual(result.code, ErrorCode.DEADLINE_EXCEEDED)
        self.assertEqual(store.get("owner", session.session_id), session)


class DurableConversationCLITests(unittest.TestCase):
    def test_separate_cli_processes_share_the_conversation(self):
        env = dict(os.environ, XSUS_EN_MODEL_PROFILE="conversation-v3")
        env.pop("XSUS_EN_CHECKPOINT", None)
        with TemporaryDirectory() as directory:
            database = Path(directory) / "chat.db"
            command = [
                sys.executable, "-m", "languages.en.evaluation.demo", "--session-db", str(database),
            ]
            first = subprocess.run(
                [*command, "Give this a warmer tone: We need the receipt by Friday at 9 a.m."],
                env=env, cwd=PACKAGE_ROOT, capture_output=True, text=True, check=True, timeout=15,
            )
            self.assertEqual(first.stdout.strip(), "We would appreciate receiving the receipt by Friday at 9 a.m.")
            self.assertRegex(first.stderr, r"^Session: [a-f0-9]{32}\n$")
            session_id = first.stderr.strip().removeprefix("Session: ")
            second = subprocess.run(
                [*command, "--session-id", session_id, "Can you say it in fewer words?"],
                env=env, cwd=PACKAGE_ROOT, capture_output=True, text=True, check=True, timeout=15,
            )
            self.assertEqual(second.stdout.strip(), "Please send the receipt by Friday at 9 a.m.")
