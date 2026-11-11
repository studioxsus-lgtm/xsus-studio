"""Shared HTTP path, authorization format and message size limits."""

import re
from ipaddress import ip_address

from aiohttp import StreamReader

EXECUTE_PATH = "/v1/execute"
DEFAULT_MAX_BYTES = 8 * 1024 * 1024


def bearer_header(token: str) -> str:
    if not isinstance(token, str) or re.fullmatch(r"[A-Za-z0-9._~+/=-]+", token) is None:
        raise ValueError("Worker bearer token must be a nonempty ASCII token")
    return f"Bearer {token}"


def is_loopback(host: str) -> bool:
    try:
        return ip_address(host).is_loopback
    except ValueError:
        return False


def require_positive_integer(value: int, field: str) -> None:
    if type(value) is not int or value <= 0:
        raise ValueError(f"{field} must be a positive integer")


class BodyTooLarge(ValueError):
    """The encoded HTTP body exceeds the configured limit."""


async def read_body(stream: StreamReader, max_bytes: int) -> bytes:
    body = bytearray()
    async for chunk in stream.iter_chunked(64 * 1024):
        if len(body) + len(chunk) > max_bytes:
            raise BodyTooLarge("Encoded HTTP body exceeds configured limit")
        body.extend(chunk)
    return bytes(body)
