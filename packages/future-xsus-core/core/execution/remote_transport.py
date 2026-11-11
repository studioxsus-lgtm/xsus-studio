"""Call a configured engine worker over HTTP using a shared client session."""

from collections.abc import Mapping
from dataclasses import dataclass, field
from http import HTTPStatus
from time import time_ns
from urllib.parse import urlsplit

from aiohttp import ClientConnectionError, ClientError, ClientSession, ClientSSLError, ClientTimeout

from ..contracts.engine import EngineInstance
from ..contracts.errors import EngineError, ErrorCode
from ..contracts.request import EngineRequest
from ..contracts.response import EngineResponse
from .http_protocol import (
    DEFAULT_MAX_BYTES, EXECUTE_PATH, bearer_header, is_loopback, read_body, require_positive_integer,
)
from .http_wire import decode_response, encode_request

_HTTP_ERRORS = {
    HTTPStatus.REQUEST_TIMEOUT: ErrorCode.INSTANCE_TIMEOUT,
    HTTPStatus.GATEWAY_TIMEOUT: ErrorCode.INSTANCE_TIMEOUT,
    HTTPStatus.BAD_GATEWAY: ErrorCode.INSTANCE_UNAVAILABLE,
    HTTPStatus.SERVICE_UNAVAILABLE: ErrorCode.INSTANCE_UNAVAILABLE,
    HTTPStatus.TOO_MANY_REQUESTS: ErrorCode.INSTANCE_OVERLOADED,
    HTTPStatus.BAD_REQUEST: ErrorCode.INVALID_REQUEST,
    HTTPStatus.REQUEST_ENTITY_TOO_LARGE: ErrorCode.INVALID_REQUEST,
}


@dataclass(frozen=True, slots=True)
class WorkerEndpoint:
    origin: str
    token: str = field(repr=False)

    def __post_init__(self) -> None:
        bearer_header(self.token)
        parsed = urlsplit(self.origin)
        if (
            not parsed.hostname or parsed.username is not None or parsed.password is not None
            or parsed.path not in ("", "/") or parsed.query or parsed.fragment
            or parsed.port == 0
        ):
            raise ValueError("Worker origin must contain only scheme, host and optional port")
        if parsed.scheme != "https" and not (parsed.scheme == "http" and is_loopback(parsed.hostname)):
            raise ValueError("Worker origin requires HTTPS or an HTTP loopback address")


class RemoteEngineTransport:
    def __init__(
        self,
        session: ClientSession,
        endpoints: Mapping[EngineInstance, WorkerEndpoint],
        *,
        max_bytes: int = DEFAULT_MAX_BYTES,
        timeout_ms: int = 30_000,
    ) -> None:
        require_positive_integer(max_bytes, "max_bytes")
        require_positive_integer(timeout_ms, "timeout_ms")
        self._session = session
        self._endpoints = dict(endpoints)
        self._max_bytes = max_bytes
        self._timeout_ms = timeout_ms

    async def invoke(self, instance: EngineInstance, request: EngineRequest) -> EngineResponse:
        def failure(code: ErrorCode, message: str) -> EngineResponse:
            return EngineResponse(request.request_id, request.attempt_id, instance, EngineError(code, message))

        endpoint = self._endpoints.get(instance)
        if endpoint is None:
            return failure(ErrorCode.INSTANCE_UNAVAILABLE, "Remote instance has no configured endpoint")
        try:
            body = encode_request(request, instance)
        except ValueError:
            return failure(ErrorCode.INVALID_REQUEST, "Request could not be encoded")
        if len(body) > self._max_bytes:
            return failure(ErrorCode.INVALID_REQUEST, "Encoded request exceeds the configured size limit")
        remaining_ms = request.deadline_unix_ms - time_ns() // 1_000_000
        if remaining_ms <= 0:
            return failure(ErrorCode.DEADLINE_EXCEEDED, "Request deadline expired")
        try:
            async with self._session.post(
                endpoint.origin.rstrip("/") + EXECUTE_PATH,
                data=body,
                headers={
                    "Authorization": bearer_header(endpoint.token),
                    "Content-Type": "application/json",
                    "Accept-Encoding": "identity",
                },
                allow_redirects=False,
                auto_decompress=False,
                raise_for_status=False,
                timeout=ClientTimeout(total=min(remaining_ms, self._timeout_ms) / 1_000),
            ) as response:
                if response.status != HTTPStatus.OK:
                    return failure(_HTTP_ERRORS.get(response.status, ErrorCode.INTERNAL), "Worker rejected the request")
                if response.content_type != "application/json" or response.headers.get("Content-Encoding", "identity") != "identity":
                    return failure(ErrorCode.INTERNAL, "Unexpected worker response format")
                if response.content_length is not None and response.content_length > self._max_bytes:
                    return failure(ErrorCode.INTERNAL, "Worker response exceeds the configured size limit")
                result = decode_response(await read_body(response.content, self._max_bytes))
                result.validate_for(request, instance)
                return result
        except TimeoutError:
            if request.deadline_unix_ms <= time_ns() // 1_000_000:
                return failure(ErrorCode.DEADLINE_EXCEEDED, "Request deadline expired")
            return failure(ErrorCode.INSTANCE_TIMEOUT, "Remote worker did not respond in time")
        except ClientSSLError:
            return failure(ErrorCode.INTERNAL, "Worker TLS validation failed")
        except ClientConnectionError:
            return failure(ErrorCode.INSTANCE_UNAVAILABLE, "Remote worker connection failed")
        except (ClientError, KeyError, RecursionError, ValueError):
            return failure(ErrorCode.INTERNAL, "Worker returned an invalid HTTP response")
