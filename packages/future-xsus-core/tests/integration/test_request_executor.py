import asyncio
import unittest
from dataclasses import replace
from time import time_ns

from core.contracts.common import Capability, LanguageTag, V1
from core.contracts.engine import EngineDescriptor, EngineIdentity, EngineInstance, LanguageSupport
from core.contracts.errors import EngineError, ErrorCode
from core.contracts.request import Conversation, EngineRequest
from core.contracts.response import EngineResponse, TextResult
from core.execution.local_transport import LocalEngineTransport
from core.execution.request_executor import RequestExecutor
from core.registry.engine_registry import EngineRegistry
from core.registry.instance import InstanceStatus
from core.routing.metrics import RoutingMetrics
from core.routing.request_router import RequestRouter

SQ = LanguageTag("sq")


def deadline_in(milliseconds):
    return time_ns() // 1_000_000 + milliseconds


class TestEngine:
    __test__ = False

    def __init__(self, descriptor, instance_id, outcome=None, handler=None):
        self.descriptor = descriptor
        self.instance = EngineInstance(descriptor.identity, instance_id)
        self.outcome = outcome if outcome is not None else TextResult("Mirëdita", SQ)
        self.handler = handler
        self.calls = []

    def response(self, request):
        return EngineResponse(request.request_id, request.attempt_id, self.instance, self.outcome)

    async def execute(self, request):
        self.calls.append(request)
        if self.handler is not None:
            return await self.handler(request)
        return self.response(request)


class RequestExecutorTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.registry = EngineRegistry()
        self.router = RequestRouter(self.registry, RoutingMetrics())
        self.identity = EngineIdentity("xsus-sq", "1", V1)
        self.support = LanguageSupport(SQ, frozenset({Capability.CONVERSATION}))
        self.descriptor = EngineDescriptor(self.identity, (self.support,))
        self.request = EngineRequest("req-1", "attempt-1", V1, SQ, deadline_in(5_000), Conversation("Përshëndetje"))

    def engine(self, name, *, descriptor=None, outcome=None, handler=None):
        engine = TestEngine(descriptor or self.descriptor, name, outcome, handler)
        self.registry.register_engine(engine.descriptor)
        self.registry.register_instance(engine.instance, status=InstanceStatus.READY)
        return engine

    def executor(self, *engines, **options):
        return RequestExecutor(self.router, LocalEngineTransport(engines), **options)

    async def test_calls_selected_local_engine_and_returns_its_validated_response(self):
        first = self.engine("a-first")
        backup = self.engine("b-backup")
        result = await self.executor(first, backup).execute(self.request)
        self.assertEqual(result, first.response(self.request))
        self.assertEqual(first.calls, [self.request])
        self.assertEqual(backup.calls, [])

    async def test_retries_on_same_revision_and_preserves_request_deadline(self):
        first = self.engine("a-first", outcome=EngineError(ErrorCode.INSTANCE_OVERLOADED, "Busy"))
        other = replace(self.descriptor, identity=replace(self.identity, revision="2"))
        other_revision = self.engine("b-other-revision", descriptor=other)
        backup = self.engine("c-backup")
        result = await self.executor(first, other_revision, backup).execute(self.request)
        self.assertEqual(result.instance, backup.instance)
        self.assertEqual(other_revision.calls, [])
        (retry,) = backup.calls
        self.assertNotEqual(retry.attempt_id, self.request.attempt_id)
        self.assertEqual(replace(retry, attempt_id=self.request.attempt_id), self.request)
        self.assertEqual(result.attempt_id, retry.attempt_id)

    async def test_missing_local_binding_allows_another_instance(self):
        missing = self.engine("a-missing")
        backup = self.engine("b-backup")
        result = await self.executor(backup).execute(self.request)
        self.assertEqual(result.instance, backup.instance)
        self.assertEqual(missing.calls, [])

    async def test_terminal_engine_error_stops_without_retry(self):
        first = self.engine("a-first", outcome=EngineError(ErrorCode.INVALID_REQUEST, "Invalid"))
        backup = self.engine("b-backup")
        result = await self.executor(first, backup).execute(self.request)
        self.assertIs(result.outcome.code, ErrorCode.INVALID_REQUEST)
        self.assertEqual(backup.calls, [])

    async def test_wrong_attempt_is_rejected_and_does_not_retry(self):
        async def wrong_attempt(request):
            return replace(first.response(request), attempt_id="previous-attempt")

        first = self.engine("a-first", handler=wrong_attempt)
        backup = self.engine("b-backup")
        with self.assertLogs("core.execution.request_executor", level="WARNING"):
            result = await self.executor(first, backup).execute(self.request)
        self.assertIs(result.code, ErrorCode.INTERNAL)
        self.assertEqual(backup.calls, [])

    async def test_unexpected_exception_is_terminal(self):
        async def broken(_request):
            raise RuntimeError("Worker raised")

        first = self.engine("a-first", handler=broken)
        backup = self.engine("b-backup")
        with self.assertLogs("core.execution.request_executor", level="WARNING"):
            result = await self.executor(first, backup).execute(self.request)
        self.assertIs(result.code, ErrorCode.INTERNAL)
        self.assertEqual(backup.calls, [])

    async def test_attempt_timeout_retries_and_discards_late_response(self):
        release = asyncio.Event()
        finished = asyncio.Event()

        async def slow(request):
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                await release.wait()
                finished.set()
                return first.response(request)

        first = self.engine("a-first", handler=slow)
        backup = self.engine("b-backup")
        try:
            result = await self.executor(first, backup, attempt_timeout_ms=100).execute(self.request)
            self.assertEqual(result.instance, backup.instance)
            self.assertEqual(len(first.calls), 1)
            self.assertFalse(finished.is_set())
        finally:
            release.set()
        await asyncio.wait_for(finished.wait(), timeout=1)

    async def test_overall_deadline_prevents_failover(self):
        async def slow(_request):
            await asyncio.Event().wait()

        first = self.engine("a-first", handler=slow)
        backup = self.engine("b-backup")
        request = replace(self.request, deadline_unix_ms=deadline_in(150))
        result = await self.executor(first, backup).execute(request)
        self.assertIs(result.code, ErrorCode.DEADLINE_EXCEEDED)
        self.assertEqual(len(first.calls), 1)
        self.assertEqual(backup.calls, [])

    async def test_expired_request_stops_before_calling_any_engine(self):
        first = self.engine("a-first")
        result = await self.executor(first).execute(replace(self.request, deadline_unix_ms=1))
        self.assertIs(result.code, ErrorCode.DEADLINE_EXCEEDED)
        self.assertEqual(first.calls, [])

    async def test_caller_cancellation_propagates_and_stops_active_attempt(self):
        started = asyncio.Event()
        stopped = asyncio.Event()

        async def active(_request):
            started.set()
            try:
                await asyncio.Event().wait()
            finally:
                stopped.set()

        first = self.engine("a-first", handler=active)
        backup = self.engine("b-backup")
        task = asyncio.create_task(self.executor(first, backup).execute(self.request))
        try:
            await asyncio.wait_for(started.wait(), timeout=1)
        finally:
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task
        await asyncio.wait_for(stopped.wait(), timeout=1)
        self.assertEqual(backup.calls, [])

    async def test_exhausted_attempt_budget_returns_last_failure(self):
        first = self.engine("a-first", outcome=EngineError(ErrorCode.INSTANCE_UNAVAILABLE, "Down"))
        backup = self.engine("b-backup")
        result = await self.executor(first, backup, max_attempts=1).execute(self.request)
        self.assertEqual(result, first.response(self.request))
        self.assertEqual(backup.calls, [])

    async def test_no_route_returns_error_without_fabricating_instance(self):
        result = await self.executor().execute(self.request)
        self.assertIsInstance(result, EngineError)
        self.assertIs(result.code, ErrorCode.INSTANCE_UNAVAILABLE)

    async def test_invalid_limits_and_duplicate_bindings_are_rejected(self):
        engine = self.engine("a-first")
        with self.assertRaises(ValueError):
            LocalEngineTransport((engine, engine))
        for options in ({"max_attempts": 0}, {"attempt_timeout_ms": True}):
            with self.subTest(options=options), self.assertRaises(ValueError):
                self.executor(engine, **options)
