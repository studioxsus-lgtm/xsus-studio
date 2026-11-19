"""HTTP adapter for owner-scoped conversations in Future XSUS Core."""

import asyncio
import json
import re
import sqlite3
from collections.abc import Mapping
from hmac import compare_digest
from time import time_ns
from typing import Protocol
from urllib.parse import quote

from aiohttp import web

from core.contracts.common import LanguageTag, require_identifier
from core.contracts.errors import EngineError, ErrorCode
from core.contracts.response import EngineResponse, TextResult
from core.conversation.session_conversation import SessionConversation
from core.sessions.session_store import (
    SessionCapacityError,
    SessionNotFoundError,
    SessionPage,
    SessionRevisionError,
    SessionSnapshot,
)
from languages.en.data.preparation.corpus import Example, parse_example


class SessionStore(Protocol):
    def create(self, owner_id: str) -> SessionSnapshot: ...

    def get(self, owner_id: str, session_id: str) -> SessionSnapshot: ...

    def delete(self, owner_id: str, session_id: str) -> None: ...

    def list_sessions(self, owner_id: str, *, limit: int = 20, after: str | None = None) -> SessionPage: ...


class LearningFeedbackStore(Protocol):
    def submit(self, owner_id: str, example: Example, *, consent: bool): ...

    def pending_ids(self, owner_id: str, *, limit: int = 100) -> tuple[str, ...]: ...

    def review(self, owner_id: str, example_id: str, *, approved: bool): ...

    def forget(self, owner_id: str, example_id: str) -> bool: ...


_BEARER_TOKEN = re.compile(r"[A-Za-z0-9._~+/=-]{1,512}", re.ASCII)
_MAX_BODY_BYTES = 32 * 1024
_MAX_TEXT_CHARS = 4_096
_REQUEST_TIMEOUT_MS = 10_000

_ENGINE_FAILURES = {
    ErrorCode.INVALID_REQUEST: (422, "The engine could not process this request"),
    ErrorCode.UNSUPPORTED_LANGUAGE: (422, "The engine does not support this language"),
    ErrorCode.UNSUPPORTED_CAPABILITY: (422, "The engine does not support this operation"),
    ErrorCode.INSTANCE_UNAVAILABLE: (503, "No engine instance is available"),
    ErrorCode.INSTANCE_OVERLOADED: (503, "The engine is busy"),
    ErrorCode.DEADLINE_EXCEEDED: (504, "The conversation request timed out"),
    ErrorCode.INSTANCE_TIMEOUT: (504, "The engine did not respond in time"),
}


def _json(payload: dict, *, status: int = 200, headers: dict | None = None) -> web.Response:
    return web.json_response(payload, status=status, headers={"Cache-Control": "no-store", **(headers or {})})


def _error(status: int, code: str, message: str, *, headers: dict | None = None) -> web.Response:
    return _json({"error": {"code": code, "message": message}}, status=status, headers=headers)


def _snapshot(snapshot: SessionSnapshot) -> dict:
    return {
        "session_id": snapshot.session_id,
        "revision": snapshot.revision,
        "history": [{"role": turn.role.value, "text": turn.text} for turn in snapshot.history],
    }


def _encode_credentials(owner_tokens: Mapping[str, str]) -> tuple[tuple[str, bytes], ...]:
    if not owner_tokens:
        raise ValueError("At least one owner credential is required")
    credentials = []
    used = set()
    for owner, token in owner_tokens.items():
        require_identifier(owner, "owner_id")
        if not isinstance(token, str) or not _BEARER_TOKEN.fullmatch(token):
            raise ValueError("Owner credentials must be ASCII Bearer tokens")
        if token in used:
            raise ValueError("Owner credentials must be unique")
        used.add(token)
        credentials.append((owner, token.encode("ascii")))
    return tuple(credentials)


def _owner(request: web.Request, credentials: tuple[tuple[str, bytes], ...]) -> str | None:
    authorization = request.headers.getall("Authorization", ())
    if len(authorization) != 1:
        return None
    scheme, _, token = authorization[0].partition(" ")
    if scheme.lower() != "bearer" or not _BEARER_TOKEN.fullmatch(token):
        return None
    supplied = token.encode("ascii")
    match = None
    for owner, known in credentials:
        if compare_digest(supplied, known):
            match = owner
    return match


def _message(payload: object) -> tuple[str, LanguageTag, int | None]:
    if not isinstance(payload, dict) or set(payload) - {"text", "language", "expected_revision"}:
        raise ValueError("Unexpected message fields")
    text = payload.get("text")
    if not isinstance(text, str) or not text.strip() or len(text) > _MAX_TEXT_CHARS:
        raise ValueError(f"text must contain 1–{_MAX_TEXT_CHARS} characters")
    text.encode("utf-8")
    language = payload.get("language", "en")
    if not isinstance(language, str) or len(language) > 128:
        raise ValueError("Invalid language tag")
    expected_revision = payload.get("expected_revision")
    if "expected_revision" in payload and (type(expected_revision) is not int or expected_revision < 0):
        raise ValueError("Invalid expected revision")
    return text, LanguageTag(language), expected_revision


def _learning_example(payload: object) -> Example:
    allowed_fields = {"consent", "prompt", "response", "history"}
    required_fields = {"consent", "prompt", "response"}
    if not isinstance(payload, dict) or not required_fields <= set(payload) or set(payload) - allowed_fields:
        raise ValueError("Unexpected learning feedback fields")
    if payload.get("consent") is not True:
        raise ValueError("Explicit consent is required")
    if not isinstance(payload.get("prompt"), str) or len(payload["prompt"]) > _MAX_TEXT_CHARS:
        raise ValueError("Invalid prompt")
    if not isinstance(payload.get("response"), str) or len(payload["response"]) > _MAX_TEXT_CHARS:
        raise ValueError("Invalid response")
    history = payload.get("history", [])
    if not isinstance(history, list) or len(history) > 16:
        raise ValueError("Invalid feedback history")
    for turn in history:
        if not isinstance(turn, dict) or set(turn) != {"role", "text"}:
            raise ValueError("Invalid feedback history turn")
        if not isinstance(turn["text"], str) or len(turn["text"]) > _MAX_TEXT_CHARS:
            raise ValueError("Invalid feedback history text")
    return parse_example({"prompt": payload["prompt"], "response": payload["response"], "history": history})


def create_app(
    *, store: SessionStore, conversation: SessionConversation, owner_tokens: Mapping[str, str],
    max_concurrent_messages: int = 8, supported_languages: frozenset[LanguageTag] | None = None,
    feedback_store: LearningFeedbackStore | None = None,
) -> web.Application:
    """Create an app using local owner-scoped session storage and engine routing."""
    if type(max_concurrent_messages) is not int or max_concurrent_messages < 1:
        raise ValueError("max_concurrent_messages must be a positive integer")
    credentials = _encode_credentials(owner_tokens)
    active_messages = 0

    @web.middleware
    async def boundary(request, handler):
        try:
            return await handler(request)
        except web.HTTPRequestEntityTooLarge:
            return _error(413, "request_too_large", "The request body exceeds the size limit")
        except SessionNotFoundError:
            return _error(404, "session_not_found", "Session not found")
        except SessionRevisionError:
            return _error(409, "session_conflict", "Session revision no longer matches")
        except SessionCapacityError:
            return _error(503, "session_capacity", "Session capacity has been reached")
        except sqlite3.Error:
            return _error(503, "storage_unavailable", "Persistent storage is unavailable")

    def unauthorized() -> web.Response:
        return _error(
            401, "unauthorized", "A valid Bearer token is required", headers={"WWW-Authenticate": "Bearer"},
        )

    async def health(request: web.Request) -> web.Response:
        return _json({"status": "ok"})

    async def create(request: web.Request) -> web.Response:
        owner = _owner(request, credentials)
        if owner is None:
            return unauthorized()
        if await request.read():
            return _error(400, "invalid_request", "Session creation uses an empty request body")
        snapshot = await asyncio.to_thread(store.create, owner)
        location = "/v1/sessions/" + quote(snapshot.session_id, safe="")
        return _json(_snapshot(snapshot), status=201, headers={"Location": location})

    async def list_sessions(request: web.Request) -> web.Response:
        owner = _owner(request, credentials)
        if owner is None:
            return unauthorized()
        query = request.query
        keys = tuple(query.keys())
        if set(keys) - {"limit", "after"} or len(set(keys)) != len(keys):
            return _error(400, "invalid_pagination", "Use a single limit and after cursor")
        raw_limit = query.get("limit", "20")
        if re.fullmatch(r"[0-9]{1,3}", raw_limit) is None:
            return _error(400, "invalid_pagination", "limit must be an integer from 1 to 100")
        try:
            page = await asyncio.to_thread(
                store.list_sessions, owner, limit=int(raw_limit), after=query.get("after"),
            )
        except ValueError:
            return _error(400, "invalid_pagination", "Invalid limit or after cursor")
        return _json({
            "sessions": [
                {"session_id": item.session_id, "revision": item.revision} for item in page.sessions
            ],
            "next_cursor": page.next_cursor,
        })

    async def get(request: web.Request) -> web.Response:
        owner = _owner(request, credentials)
        if owner is None:
            return unauthorized()
        snapshot = await asyncio.to_thread(store.get, owner, request.match_info["session_id"])
        return _json(_snapshot(snapshot))

    async def delete(request: web.Request) -> web.Response:
        owner = _owner(request, credentials)
        if owner is None:
            return unauthorized()
        await asyncio.to_thread(store.delete, owner, request.match_info["session_id"])
        return web.Response(status=204, headers={"Cache-Control": "no-store"})

    async def send(request: web.Request) -> web.Response:
        nonlocal active_messages
        owner = _owner(request, credentials)
        if owner is None:
            return unauthorized()
        if request.content_type != "application/json":
            return _error(415, "unsupported_media_type", "Use application/json")
        try:
            text, language, expected_revision = _message(json.loads((await request.read()).decode("utf-8")))
        except (ValueError, RecursionError):
            return _error(400, "invalid_request", "Invalid message JSON, text, language, or expected revision")
        if supported_languages is not None and language not in supported_languages:
            status, message = _ENGINE_FAILURES[ErrorCode.UNSUPPORTED_LANGUAGE]
            return _error(status, ErrorCode.UNSUPPORTED_LANGUAGE.value, message)
        session_id = request.match_info["session_id"]
        if active_messages >= max_concurrent_messages:
            return _error(503, "message_capacity", "The conversation service is busy")
        active_messages += 1
        try:
            result = await conversation.execute(
                owner, session_id, text, language=language,
                deadline_unix_ms=time_ns() // 1_000_000 + _REQUEST_TIMEOUT_MS,
                expected_revision=expected_revision,
            )
        except ValueError:
            return _error(422, "message_rejected", "The message could not be saved to the session")
        finally:
            active_messages -= 1
        outcome = result.outcome if isinstance(result, EngineResponse) else result
        if isinstance(outcome, EngineError):
            status, message = _ENGINE_FAILURES.get(outcome.code, (502, "The engine could not answer"))
            return _error(status, outcome.code.value, message)
        if not isinstance(result, EngineResponse) or not isinstance(outcome, TextResult):
            return _error(502, "invalid_engine_response", "The engine returned an invalid response")
        return _json({
            "session_id": session_id,
            "request_id": result.request_id,
            "text": outcome.text,
            "language": outcome.language.value,
        })

    async def submit_feedback(request: web.Request) -> web.Response:
        owner = _owner(request, credentials)
        if owner is None:
            return unauthorized()
        if request.content_type != "application/json":
            return _error(415, "unsupported_media_type", "Use application/json")
        try:
            payload = json.loads((await request.read()).decode("utf-8"))
            example = _learning_example(payload)
        except (UnicodeError, ValueError, TypeError, KeyError, RecursionError):
            return _error(400, "invalid_learning_feedback", "Feedback must include valid English text and explicit consent")
        try:
            record = await asyncio.to_thread(feedback_store.submit, owner, example, consent=True)
        except ValueError:
            return _error(400, "invalid_learning_feedback", "Feedback could not be accepted")
        return _json({"example_id": record.example_id, "status": record.status}, status=202)

    async def list_feedback(request: web.Request) -> web.Response:
        owner = _owner(request, credentials)
        if owner is None:
            return unauthorized()
        try:
            pending = await asyncio.to_thread(feedback_store.pending_ids, owner, limit=100)
        except ValueError:
            return _error(400, "invalid_learning_feedback_query", "Invalid feedback query")
        return _json({"pending": list(pending)})

    async def review_feedback(request: web.Request) -> web.Response:
        owner = _owner(request, credentials)
        if owner is None:
            return unauthorized()
        decision = request.match_info["decision"]
        if decision not in {"accept", "reject"}:
            return _error(404, "feedback_not_found", "Learning feedback not found")
        try:
            record = await asyncio.to_thread(
                feedback_store.review, owner, request.match_info["example_id"], approved=decision == "accept",
            )
        except KeyError:
            return _error(404, "feedback_not_found", "Learning feedback not found")
        except ValueError:
            return _error(409, "feedback_already_reviewed", "A reviewed decision cannot be changed")
        return _json({"example_id": record.example_id, "status": record.status})

    async def forget_feedback(request: web.Request) -> web.Response:
        owner = _owner(request, credentials)
        if owner is None:
            return unauthorized()
        removed = await asyncio.to_thread(feedback_store.forget, owner, request.match_info["example_id"])
        if not removed:
            return _error(404, "feedback_not_found", "Learning feedback not found")
        return web.Response(status=204, headers={"Cache-Control": "no-store"})

    app = web.Application(client_max_size=_MAX_BODY_BYTES, middlewares=[boundary])
    resource = r"/v1/sessions/{session_id:[A-Za-z0-9][A-Za-z0-9._-]{0,127}}"
    app.router.add_get("/healthz", health)
    app.router.add_post("/v1/sessions", create)
    app.router.add_get("/v1/sessions", list_sessions, allow_head=False)
    app.router.add_get(resource, get, allow_head=False)
    app.router.add_delete(resource, delete)
    app.router.add_post(resource + "/messages", send)
    if feedback_store is not None:
        app.router.add_post("/v1/learning/feedback", submit_feedback)
        app.router.add_get("/v1/learning/feedback", list_feedback, allow_head=False)
        app.router.add_post(
            r"/v1/learning/feedback/{example_id:[0-9a-f]{64}}/{decision:accept|reject}", review_feedback,
        )
        app.router.add_delete(r"/v1/learning/feedback/{example_id:[0-9a-f]{64}}", forget_feedback)
    return app
