"""Run a language engine instance as an HTTP worker."""

import argparse
import asyncio
import logging
import os
import ssl
from hmac import compare_digest
from importlib import import_module
from time import time_ns

from aiohttp import web

from core.contracts.engine import LanguageEngine
from core.contracts.errors import EngineError, ErrorCode
from core.contracts.response import EngineResponse
from core.execution.http_protocol import (
    DEFAULT_MAX_BYTES, EXECUTE_PATH, BodyTooLarge, bearer_header, is_loopback,
    read_body, require_positive_integer,
)
from core.execution.http_wire import decode_request, encode_response

_LOGGER = logging.getLogger(__name__)


def create_app(
    engine: LanguageEngine,
    token: str,
    *,
    max_bytes: int = DEFAULT_MAX_BYTES,
    timeout_ms: int = 30_000,
) -> web.Application:
    authorization = bearer_header(token).encode("ascii")
    require_positive_integer(max_bytes, "max_bytes")
    require_positive_integer(timeout_ms, "timeout_ms")
    instance = engine.instance
    descriptor = engine.descriptor
    if descriptor.identity != instance.engine:
        raise ValueError("Worker descriptor does not match the engine instance")

    async def execute(http_request: web.Request) -> web.Response:
        credentials = http_request.headers.getall("Authorization", ())
        if (
            len(credentials) != 1 or not credentials[0].isascii()
            or not compare_digest(credentials[0].encode("ascii"), authorization)
        ):
            raise web.HTTPUnauthorized(headers={"WWW-Authenticate": "Bearer"})
        if http_request.content_type != "application/json" or http_request.headers.get("Content-Encoding", "identity") != "identity":
            raise web.HTTPUnsupportedMediaType()
        if http_request.content_length is not None and http_request.content_length > max_bytes:
            raise web.HTTPRequestEntityTooLarge(max_size=max_bytes, actual_size=http_request.content_length)
        try:
            raw = await read_body(http_request.content, max_bytes)
        except BodyTooLarge:
            raise web.HTTPRequestEntityTooLarge(max_size=max_bytes, actual_size=max_bytes + 1) from None
        try:
            request, target = decode_request(raw)
        except (KeyError, RecursionError, ValueError):
            raise web.HTTPBadRequest() from None
        if target != instance:
            raise web.HTTPConflict()

        def failure(code: ErrorCode, message: str) -> EngineResponse:
            return EngineResponse(request.request_id, request.attempt_id, instance, EngineError(code, message))

        remaining_ms = request.deadline_unix_ms - time_ns() // 1_000_000
        if remaining_ms <= 0:
            result = failure(ErrorCode.DEADLINE_EXCEEDED, "Request deadline expired")
        elif not descriptor.accepts(request):
            result = failure(ErrorCode.INVALID_REQUEST, "Request is incompatible with this engine")
        else:
            loop = asyncio.get_running_loop()
            worker_deadline = loop.time() + min(remaining_ms, timeout_ms) / 1_000
            limit = asyncio.timeout_at(worker_deadline)
            try:
                async with limit:
                    result = await engine.execute(request)
                result.validate_for(request, instance)
            except Exception as error:
                if not limit.expired():
                    _LOGGER.warning("Worker engine failed for %s (%s)", instance.instance_id, type(error).__name__)
                result = failure(ErrorCode.INTERNAL, "Worker engine execution failed")
            if loop.time() >= worker_deadline or limit.expired():
                code = ErrorCode.DEADLINE_EXCEEDED if remaining_ms <= timeout_ms else ErrorCode.INSTANCE_TIMEOUT
                result = failure(code, "Worker execution time expired")
        try:
            encoded = encode_response(result)
        except ValueError:
            raise web.HTTPInternalServerError() from None
        if len(encoded) > max_bytes:
            raise web.HTTPInternalServerError()
        return web.Response(body=encoded, content_type="application/json")

    app = web.Application(client_max_size=max_bytes)
    app.router.add_post(EXECUTE_PATH, execute)
    return app


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--engine", required=True, help="module:factory for a LanguageEngine instance")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8081)
    parser.add_argument("--tls-cert")
    parser.add_argument("--tls-key")
    args = parser.parse_args()
    token = os.environ.get("XSUS_ENGINE_WORKER_TOKEN")
    if not token:
        parser.error("Set XSUS_ENGINE_WORKER_TOKEN")
    module, separator, factory = args.engine.partition(":")
    if not (module and separator and factory):
        parser.error("--engine must be module:factory")
    if bool(args.tls_cert) != bool(args.tls_key) or (not args.tls_cert and not is_loopback(args.host)):
        parser.error("TLS certificate and key are required together and for non-loopback hosts")
    context = None
    if args.tls_cert:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(args.tls_cert, args.tls_key)
    engine = getattr(import_module(module), factory)()
    web.run_app(
        create_app(engine, token), host=args.host, port=args.port, ssl_context=context,
        handler_cancellation=True, auto_decompress=False,
    )


if __name__ == "__main__":
    main()
