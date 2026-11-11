import asyncio
import unittest
from dataclasses import replace
from importlib import import_module
from time import time_ns

from aiohttp import ClientSession, web

from core.contracts.common import Audio, Capability, LanguageTag, V1
from core.contracts.engine import EngineDescriptor, EngineIdentity, EngineInstance, LanguageSupport
from core.contracts.errors import EngineError, ErrorCode
from core.contracts.request import (
    Conversation, ConversationRole, ConversationTurn, EngineRequest,
    SpeechSynthesis, Transcription, Translation,
)
from core.contracts.response import AudioResult, EngineResponse, TextResult, TranscriptResult
from core.execution.http_wire import encode_request, encode_response
from core.execution.remote_transport import RemoteEngineTransport, WorkerEndpoint
from core.execution.request_executor import RequestExecutor
from core.registry.engine_registry import EngineRegistry
from core.registry.instance import InstanceStatus
from core.routing.metrics import RoutingMetrics
from core.routing.request_router import RequestRouter

create_app = import_module("services.engine-worker.worker").create_app
SQ = LanguageTag("sq")
EN = LanguageTag("en")
WAV = Audio(b"opaque audio fixture", "audio/wav")
TOKEN = "test-worker-token"


class StubEngine:
    def __init__(self, instance_id, failure=None, handler=None):
        identity = EngineIdentity("xsus-sq", "1", V1)
        self.instance = EngineInstance(identity, instance_id)
        self.descriptor = EngineDescriptor(
            identity,
            (LanguageSupport(
                SQ, frozenset(Capability), frozenset({EN}),
                frozenset({"audio/wav"}), frozenset({"sq-default"}),
            ),),
        )
        self.failure = failure
        self.handler = handler
        self.calls = []

    async def execute(self, request):
        self.calls.append(request)
        if self.handler is not None:
            await self.handler()
        operation = request.operation
        if self.failure is not None:
            result = self.failure
        elif isinstance(operation, Translation):
            result = TextResult("Good afternoon", EN)
        elif isinstance(operation, Transcription):
            result = TranscriptResult("", SQ)
        elif isinstance(operation, SpeechSynthesis):
            result = AudioResult(WAV, SQ)
        else:
            result = TextResult("Mirëdita", SQ)
        return EngineResponse(request.request_id, request.attempt_id, self.instance, result)


class RemoteExecutionTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.session = ClientSession()
        self.addAsyncCleanup(self.session.close)
        self.request = EngineRequest(
            "req-1", "attempt-1", V1, SQ, time_ns() // 1_000_000 + 5_000, Conversation("Përshëndetje")
        )

    async def serve(self, app):
        runner = web.AppRunner(app, handler_cancellation=True, auto_decompress=False)
        await runner.setup()
        self.addAsyncCleanup(runner.cleanup)
        await web.TCPSite(runner, "127.0.0.1", 0).start()
        return f"http://127.0.0.1:{runner.addresses[0][1]}"

    async def worker(self, engine, **options):
        return await self.serve(create_app(engine, TOKEN, **options))

    def transport(self, engine, origin, token=TOKEN, **options):
        return RemoteEngineTransport(self.session, {engine.instance: WorkerEndpoint(origin, token)}, **options)

    async def test_round_trip_for_all_four_capabilities(self):
        engine = StubEngine("first")
        transport = self.transport(engine, await self.worker(engine))
        operations = (
            (Conversation("Vazhdo", (ConversationTurn(ConversationRole.USER, "Përshëndetje"),)), TextResult("Mirëdita", SQ)),
            (Translation("Mirëdita", EN), TextResult("Good afternoon", EN)),
            (Transcription(WAV), TranscriptResult("", SQ)),
            (SpeechSynthesis("Mirëdita", "sq-default"), AudioResult(WAV, SQ)),
        )
        for operation, expected in operations:
            with self.subTest(operation=operation.capability):
                request = replace(self.request, operation=operation)
                response = await transport.invoke(engine.instance, request)
                self.assertEqual(response.outcome, expected)
                self.assertEqual(engine.calls[-1], request)

    async def test_executor_fails_over_between_two_worker_addresses(self):
        first = StubEngine("a-first", EngineError(ErrorCode.INSTANCE_OVERLOADED, "Busy"))
        second = StubEngine("b-second")
        registry = EngineRegistry()
        endpoints = {}
        for engine in (first, second):
            registry.register_engine(engine.descriptor)
            registry.register_instance(engine.instance, status=InstanceStatus.READY)
            endpoints[engine.instance] = WorkerEndpoint(await self.worker(engine), TOKEN)
        executor = RequestExecutor(RequestRouter(registry, RoutingMetrics()), RemoteEngineTransport(self.session, endpoints))
        response = await executor.execute(self.request)
        self.assertEqual(response.instance, second.instance)
        self.assertEqual(first.calls, [self.request])
        self.assertEqual(len(second.calls), 1)
        retry = second.calls[0]
        self.assertNotEqual(retry.attempt_id, self.request.attempt_id)
        self.assertEqual(replace(retry, attempt_id=self.request.attempt_id), self.request)

    async def test_wrong_credentials_or_wrong_target_never_execute_engine(self):
        engine = StubEngine("real")
        origin = await self.worker(engine)
        wrong_token = await self.transport(engine, origin, "wrong").invoke(engine.instance, self.request)
        self.assertIs(wrong_token.outcome.code, ErrorCode.INTERNAL)
        wrong = StubEngine("other")
        wrong_target = await self.transport(wrong, origin).invoke(wrong.instance, self.request)
        self.assertIs(wrong_target.outcome.code, ErrorCode.INTERNAL)
        self.assertEqual(engine.calls, [])

    async def test_worker_rejects_expired_request_before_dispatch(self):
        engine = StubEngine("first")
        origin = await self.worker(engine)
        body = encode_request(replace(self.request, deadline_unix_ms=1), engine.instance)
        async with self.session.post(
            origin + "/v1/execute",
            data=body,
            headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        ) as response:
            self.assertEqual(response.status, 200)
            self.assertEqual((await response.json())["outcome"]["code"], "deadline_exceeded")
        self.assertEqual(engine.calls, [])

    async def test_incompatible_translation_is_rejected_by_worker(self):
        engine = StubEngine("first")
        transport = self.transport(engine, await self.worker(engine))
        request = replace(self.request, operation=Translation("Mirëdita", LanguageTag("fr")))
        response = await transport.invoke(engine.instance, request)
        self.assertIs(response.outcome.code, ErrorCode.INVALID_REQUEST)
        self.assertEqual(engine.calls, [])

    async def test_client_and_worker_reject_oversized_requests(self):
        engine = StubEngine("first")
        origin = await self.worker(engine, max_bytes=600)
        request = replace(self.request, operation=Conversation("a" * 700))
        for limit in (600, 2_000):
            transport = self.transport(engine, origin, max_bytes=limit)
            response = await transport.invoke(engine.instance, request)
            self.assertIs(response.outcome.code, ErrorCode.INVALID_REQUEST)
        self.assertEqual(engine.calls, [])

    async def test_malformed_or_oversized_reply_is_a_terminal_error(self):
        engine = StubEngine("first")

        async def invalid_reply(_request):
            return web.Response(body=b"{" + b" " * 700, content_type="application/json")

        app = web.Application()
        app.router.add_post("/v1/execute", invalid_reply)
        origin = await self.serve(app)
        for limit in (600, 2_000):
            response = await self.transport(engine, origin, max_bytes=limit).invoke(engine.instance, self.request)
            self.assertIs(response.outcome.code, ErrorCode.INTERNAL)

    async def test_mismatched_response_attempt_is_rejected(self):
        engine = StubEngine("first")
        response = EngineResponse(self.request.request_id, "old-attempt", engine.instance, TextResult("Mirëdita", SQ))

        async def wrong_reply(_request):
            return web.Response(body=encode_response(response), content_type="application/json")

        app = web.Application()
        app.router.add_post("/v1/execute", wrong_reply)
        origin = await self.serve(app)
        received = await self.transport(engine, origin).invoke(engine.instance, self.request)
        self.assertIs(received.outcome.code, ErrorCode.INTERNAL)

    async def test_disconnect_cancels_worker_after_client_timeout(self):
        stopped = asyncio.Event()

        async def wait_forever():
            try:
                await asyncio.Event().wait()
            finally:
                stopped.set()

        engine = StubEngine("first", handler=wait_forever)
        transport = self.transport(engine, await self.worker(engine), timeout_ms=150)
        response = await transport.invoke(engine.instance, self.request)
        self.assertIs(response.outcome.code, ErrorCode.INSTANCE_TIMEOUT)
        await asyncio.wait_for(stopped.wait(), timeout=1)

    async def test_http_redirect_is_not_followed(self):
        engine = StubEngine("first")
        destination = await self.worker(engine)

        async def redirect(_request):
            raise web.HTTPTemporaryRedirect(location=destination + "/v1/execute")

        app = web.Application()
        app.router.add_post("/v1/execute", redirect)
        response = await self.transport(engine, await self.serve(app)).invoke(engine.instance, self.request)
        self.assertIs(response.outcome.code, ErrorCode.INTERNAL)
        self.assertEqual(engine.calls, [])

    def test_endpoint_rejects_insecure_or_credential_bearing_origins(self):
        for url in ("http://192.0.2.1:80", "https://user@worker.example", "https://worker.example/path"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                WorkerEndpoint(url, TOKEN)
        self.assertNotIn(TOKEN, repr(WorkerEndpoint("https://worker.example", TOKEN)))
