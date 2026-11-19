"""Resolve Supabase access tokens to opaque, stable XSUS owner identifiers."""

import asyncio
import re
import uuid
from urllib.parse import urlsplit

from aiohttp import ClientError, ClientSession, ClientTimeout, web

from .errors import IdentityProviderUnavailable

_BEARER_TOKEN = re.compile(r"[A-Za-z0-9._~+/=-]{1,8192}", re.ASCII)


class SupabaseUserAuthenticator:
    """Verify a user token through Supabase Auth and retain only its user UUID."""

    def __init__(self, project_url: str, publishable_key: str, *, timeout_seconds: float = 5.0) -> None:
        if not isinstance(project_url, str):
            raise ValueError("Supabase project URL must be a string")
        parsed = urlsplit(project_url.rstrip("/"))
        local_http = parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1", "::1"}
        if (
            (parsed.scheme != "https" and not local_http)
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError("Supabase project URL must use HTTPS (HTTP is allowed only for loopback tests)")
        if not isinstance(publishable_key, str) or not publishable_key or len(publishable_key) > 4096:
            raise ValueError("A Supabase publishable API key is required")
        try:
            publishable_key.encode("ascii")
        except UnicodeEncodeError as error:
            raise ValueError("Supabase publishable API key must be ASCII") from error
        if type(timeout_seconds) not in (int, float) or not 0.1 <= timeout_seconds <= 30:
            raise ValueError("Identity-provider timeout must be between 0.1 and 30 seconds")
        self._user_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/')}/auth/v1/user"
        self._publishable_key = publishable_key
        self._timeout_seconds = float(timeout_seconds)
        self._session: ClientSession | None = None

    async def start(self, app: web.Application) -> None:
        if self._session is None:
            self._session = ClientSession(timeout=ClientTimeout(total=self._timeout_seconds))

    async def close(self, app: web.Application) -> None:
        if self._session is not None:
            await self._session.close()
            self._session = None

    async def authenticate(self, request: web.Request) -> str | None:
        authorization = request.headers.getall("Authorization", ())
        if len(authorization) != 1:
            return None
        scheme, separator, token = authorization[0].partition(" ")
        if scheme.lower() != "bearer" or not separator or _BEARER_TOKEN.fullmatch(token) is None:
            return None
        if self._session is None:
            raise IdentityProviderUnavailable("Supabase identity verifier is not initialized")
        try:
            async with self._session.get(
                self._user_url,
                headers={
                    "apikey": self._publishable_key,
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                },
            ) as response:
                if response.status in {401, 403}:
                    return None
                if response.status == 429 or response.status >= 500 or response.status in {404, 405}:
                    raise IdentityProviderUnavailable("Supabase Auth is temporarily unavailable")
                if response.status != 200:
                    return None
                try:
                    user = await response.json(content_type=None)
                except (ValueError, TypeError) as error:
                    raise IdentityProviderUnavailable("Supabase Auth returned an invalid identity response") from error
        except (ClientError, asyncio.TimeoutError) as error:
            raise IdentityProviderUnavailable("Supabase Auth could not be reached") from error
        if not isinstance(user, dict) or not isinstance(user.get("id"), str):
            raise IdentityProviderUnavailable("Supabase Auth returned an invalid identity response")
        try:
            user_id = str(uuid.UUID(user["id"]))
        except (ValueError, AttributeError) as error:
            raise IdentityProviderUnavailable("Supabase Auth returned an invalid user identifier") from error
        return "supabase-" + user_id
