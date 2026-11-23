"""HTTP adapter for owner-scoped conversations in Future XSUS Core."""

import asyncio
import hashlib
import json
import re
import sqlite3
from collections.abc import Mapping
from hmac import compare_digest
from pathlib import Path
from time import time_ns, monotonic
from typing import Protocol
from urllib.parse import quote, urlsplit

from aiohttp import web
from dataclasses import asdict
from core.routing.sq_analysis_contract import analyze_albanian

from core.intelligence.xsus_app_adapter_v1 import XSUSAppIntelligenceAdapter
from core.intelligence.authorized_gateway_v1 import IntelligencePrincipal
from core.intelligence.xsus_app_adapter_v2 import XSUSAppIntelligenceAdapterV2
from core.intelligence.request_router_v2 import RouterPrincipal

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
from languages.en.text.editing.paragraph import ParagraphStatus, proofread_paragraph
from services.api.identity.errors import IdentityProviderUnavailable
from services.api.intelligence_metrics_v1 import IntelligenceMetrics

INTELLIGENCE_METRICS = web.AppKey('intelligence_metrics', IntelligenceMetrics)


class SessionStore(Protocol):
    def create(self, owner_id: str) -> SessionSnapshot: ...

    def get(self, owner_id: str, session_id: str) -> SessionSnapshot: ...

    def delete(self, owner_id: str, session_id: str) -> None: ...

    def list_sessions(self, owner_id: str, *, limit: int = 20, after: str | None = None) -> SessionPage: ...


class LearningFeedbackStore(Protocol):
    def submit(self, owner_id: str, example: Example, *, consent: bool): ...

    def get(self, owner_id: str, example_id: str): ...

    def pending_ids(self, owner_id: str, *, limit: int = 100) -> tuple[str, ...]: ...

    def counts(self, owner_id: str) -> dict[str, int]: ...

    def review(self, owner_id: str, example_id: str, *, approved: bool): ...

    def forget(self, owner_id: str, example_id: str) -> bool: ...


class OwnerAuthenticator(Protocol):
    async def authenticate(self, request: web.Request) -> str | None: ...


_BEARER_TOKEN = re.compile(r"[A-Za-z0-9._~+/=-]{1,8192}", re.ASCII)
_MAX_BODY_BYTES = 32 * 1024
_MAX_TEXT_CHARS = 4_096
_REQUEST_TIMEOUT_MS = 10_000
_CORS_METHODS = frozenset({"GET", "POST", "DELETE"})
_CORS_HEADERS = frozenset({"authorization", "content-type"})

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


def _strict_json_pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON field")
        result[key] = value
    return result


def _reject_json_constant(value):
    raise ValueError("Non-finite JSON constant")


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


def _proofread_request(payload: object) -> tuple[str, LanguageTag]:
    if not isinstance(payload, dict) or set(payload) - {"text", "language"}:
        raise ValueError("Unexpected language request fields")
    text = payload.get("text")
    if not isinstance(text, str) or not text.strip() or len(text) > _MAX_TEXT_CHARS:
        raise ValueError(f"text must contain 1–{_MAX_TEXT_CHARS} characters")
    text.encode("utf-8")
    language = payload.get("language", "en")
    if not isinstance(language, str) or len(language) > 128:
        raise ValueError("Invalid language tag")
    return text, LanguageTag(language)


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


def _validate_origins(origins: frozenset[str]) -> frozenset[str]:
    if not isinstance(origins, frozenset) or any(not isinstance(origin, str) for origin in origins):
        raise ValueError("Allowed browser origins must be a frozenset of origin strings")
    normalized = set()
    for origin in origins:
        parsed = urlsplit(origin)
        local_http = parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1", "::1"}
        if (
            (parsed.scheme != "https" and not local_http)
            or not parsed.netloc
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path not in ("", "/")
            or parsed.query
            or parsed.fragment
            or origin != f"{parsed.scheme}://{parsed.netloc}"
        ):
            raise ValueError("Allowed browser values must be exact HTTPS origins (HTTP only for loopback)")
        normalized.add(origin)
    return frozenset(normalized)


def create_app(
    *, store: SessionStore, conversation: SessionConversation, owner_tokens: Mapping[str, str] | None = None,
    owner_authenticator: OwnerAuthenticator | None = None,
    max_concurrent_messages: int = 8, supported_languages: frozenset[LanguageTag] | None = None,
    feedback_store: LearningFeedbackStore | None = None, allowed_origins: frozenset[str] = frozenset(),
    learning_status_dir: Path | None = None,
    intelligence_enabled: bool = False,
    intelligence_v2_adapter: XSUSAppIntelligenceAdapterV2 | None = None,
    intelligence_v2_permissions: Mapping[str, frozenset[str]] | None = None,
    albanian_analysis_enabled: bool = False,
) -> web.Application:
    """Create an app using local owner-scoped session storage and engine routing."""
    if type(max_concurrent_messages) is not int or max_concurrent_messages < 1:
        raise ValueError("max_concurrent_messages must be a positive integer")
    if owner_authenticator is None:
        credentials = _encode_credentials(owner_tokens or {})
    else:
        credentials = _encode_credentials(owner_tokens) if owner_tokens else ()
    if type(intelligence_enabled) is not bool:
        raise ValueError("intelligence_enabled must be boolean")
    intelligence_adapter = XSUSAppIntelligenceAdapter() if intelligence_enabled else None
    if intelligence_v2_adapter is not None and not isinstance(intelligence_v2_adapter, XSUSAppIntelligenceAdapterV2):
        raise ValueError('Invalid V2 adapter')
    public_operations = frozenset(("reason", "solve", "infer", "search"))
    v2_permissions = None
    if intelligence_v2_permissions is not None:
        if not isinstance(intelligence_v2_permissions, Mapping):
            raise ValueError("Invalid V2 permissions policy")
        v2_permissions = dict(intelligence_v2_permissions)
        for identity, permissions in v2_permissions.items():
            require_identifier(identity, "owner_id")
            if type(permissions) is not frozenset or not permissions <= public_operations:
                raise ValueError("Invalid V2 permissions")
    cors_origins = _validate_origins(allowed_origins)
    active_messages = 0
    active_language_requests = 0
    active_intelligence_requests = 0
    metrics = IntelligenceMetrics()

    @web.middleware
    async def intelligence_monitor(request, handler):
        if request.method != "POST" or request.path != "/v1/intelligence/reason":
            return await handler(request)
        start = monotonic()
        status = 500
        try:
            response = await handler(request)
            status = response.status
            return response
        except asyncio.CancelledError:
            status = None
            raise
        except web.HTTPException as error:
            status = error.status
            raise
        finally:
            metrics.observe(status, (monotonic() - start) * 1000)

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
        except IdentityProviderUnavailable:
            return _error(503, "identity_provider_unavailable", "The identity provider is temporarily unavailable")
        except sqlite3.Error:
            return _error(503, "storage_unavailable", "Persistent storage is unavailable")

    @web.middleware
    async def cors_boundary(request, handler):
        origins = request.headers.getall("Origin", ())
        if len(origins) > 1 or (origins and origins[0] not in cors_origins):
            return _error(403, "origin_not_allowed", "This browser origin is not allowed")
        origin = origins[0] if origins else None
        if request.method == "OPTIONS" and request.headers.get("Access-Control-Request-Method"):
            method = request.headers["Access-Control-Request-Method"].upper()
            requested_headers = {
                item.strip().lower() for item in request.headers.get("Access-Control-Request-Headers", "").split(",")
                if item.strip()
            }
            if origin is None or method not in _CORS_METHODS or not requested_headers <= _CORS_HEADERS:
                response = _error(403, "preflight_not_allowed", "The requested browser operation is not allowed")
            else:
                response = web.Response(status=204)
                response.headers["Access-Control-Allow-Methods"] = ", ".join(sorted(_CORS_METHODS))
                response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
                response.headers["Access-Control-Max-Age"] = "600"
        else:
            response = await handler(request)
        if origin is not None:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers.add("Vary", "Origin")
        return response

    def unauthorized() -> web.Response:
        return _error(
            401, "unauthorized", "A valid Bearer token is required", headers={"WWW-Authenticate": "Bearer"},
        )

    async def authenticated_owner(request: web.Request) -> str | None:
        if owner_authenticator is None:
            return _owner(request, credentials)
        owner = await owner_authenticator.authenticate(request)
        if owner is None:
            return None
        try:
            require_identifier(owner, "owner_id")
        except ValueError:
            return None
        return owner

    async def health(request: web.Request) -> web.Response:
        return _json({"status": "ok"})

    async def options(request: web.Request) -> web.Response:
        return web.Response(status=204)

    async def create(request: web.Request) -> web.Response:
        owner = await authenticated_owner(request)
        if owner is None:
            return unauthorized()
        if await request.read():
            return _error(400, "invalid_request", "Session creation uses an empty request body")
        snapshot = await asyncio.to_thread(store.create, owner)
        location = "/v1/sessions/" + quote(snapshot.session_id, safe="")
        return _json(_snapshot(snapshot), status=201, headers={"Location": location})

    async def list_sessions(request: web.Request) -> web.Response:
        owner = await authenticated_owner(request)
        if owner is None:
            return unauthorized()
        query = request.query
        # Multidict.keys() de-duplicates names; inspect items to reject repeated
        # query parameters instead of silently accepting the first value.
        keys = tuple(key for key, _ in query.items())
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
        owner = await authenticated_owner(request)
        if owner is None:
            return unauthorized()
        snapshot = await asyncio.to_thread(store.get, owner, request.match_info["session_id"])
        return _json(_snapshot(snapshot))

    async def delete(request: web.Request) -> web.Response:
        owner = await authenticated_owner(request)
        if owner is None:
            return unauthorized()
        await asyncio.to_thread(store.delete, owner, request.match_info["session_id"])
        return web.Response(status=204, headers={"Cache-Control": "no-store"})

    async def send(request: web.Request) -> web.Response:
        nonlocal active_messages
        owner = await authenticated_owner(request)
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

    async def proofread(request: web.Request) -> web.Response:
        nonlocal active_language_requests
        owner = await authenticated_owner(request)
        if owner is None:
            return unauthorized()
        if request.content_type != "application/json":
            return _error(415, "unsupported_media_type", "Use application/json")
        try:
            text, language = _proofread_request(json.loads((await request.read()).decode("utf-8")))
        except (UnicodeError, ValueError, RecursionError):
            return _error(400, "invalid_request", "Invalid proofreading request")
        if language != LanguageTag("en"):
            status, message = _ENGINE_FAILURES[ErrorCode.UNSUPPORTED_LANGUAGE]
            return _error(status, ErrorCode.UNSUPPORTED_LANGUAGE.value, message)
        if active_language_requests >= max_concurrent_messages:
            return _error(503, "language_capacity", "The language service is busy")
        active_language_requests += 1
        try:
            result = await asyncio.to_thread(proofread_paragraph, text)
        finally:
            active_language_requests -= 1
        return _json({
            "language": language.value,
            "status": result.status.value,
            "text": result.text,
            "review_required": result.status in {ParagraphStatus.PARTIAL, ParagraphStatus.REVIEW_REQUIRED},
            "persisted": False,
        })

    async def albanian_analyze(request: web.Request) -> web.Response:
        if not albanian_analysis_enabled:
            return _error(404, "not_found", "Resource not found")
        owner = await authenticated_owner(request)
        if owner is None:
            return unauthorized()
        if request.content_type != "application/json":
            return _error(415, "unsupported_media_type", "Use application/json")
        try:
            payload = json.loads((await request.read()).decode("utf-8"),
                                 object_pairs_hook=_strict_json_pairs,
                                 parse_constant=_reject_json_constant)
            if not isinstance(payload, dict) or set(payload) != {"text", "language"}:
                raise ValueError("Expected exactly text and language")
            text = payload["text"]
            language = payload["language"]
            if not isinstance(text, str) or not text.strip() or len(text) > _MAX_TEXT_CHARS:
                raise ValueError("Invalid text")
            text.encode("utf-8")
            if not isinstance(language, str):
                raise ValueError("Invalid language")
            tag = LanguageTag(language)
        except (UnicodeError, ValueError, TypeError, RecursionError):
            return _error(400, "invalid_request", "Invalid analysis request")
        if tag.value != "sq":
            return _error(422, "unsupported_language", "Only sq analysis is supported")
        result = await asyncio.to_thread(analyze_albanian, text, language=tag)
        return _json({"language": result.language.value,
                      "analysis": asdict(result.analysis),
                      "quality": asdict(result.quality),
                      "persisted": False})

    async def intelligence_reason(request: web.Request) -> web.Response:
        nonlocal active_intelligence_requests
        if not intelligence_enabled:
            return _error(404, "not_found", "Resource not found")
        owner = await authenticated_owner(request)
        if owner is None:
            return unauthorized()
        if request.content_type != "application/json":
            return _error(415, "unsupported_media_type", "Use application/json")
        try:
            payload = json.loads((await request.read()).decode("utf-8"),
                                 object_pairs_hook=_strict_json_pairs,
                                 parse_constant=_reject_json_constant)
            scope = "u_" + hashlib.sha256(owner.encode("utf-8")).hexdigest()[:62]
            principal = IntelligencePrincipal(scope, frozenset(("reason",)))
            if active_intelligence_requests >= min(max_concurrent_messages, 8):
                return _error(503, "intelligence_unavailable", "Intelligence service unavailable")
            active_intelligence_requests += 1
            def release(task):
                nonlocal active_intelligence_requests
                active_intelligence_requests -= 1
                if not task.cancelled():
                    task.exception()
            try:
                task = asyncio.create_task(asyncio.to_thread(intelligence_adapter.reason, principal, payload))
            except BaseException:
                active_intelligence_requests -= 1
                raise
            task.add_done_callback(release)
            result = await asyncio.shield(task)
        except (ValueError, TypeError, UnicodeError, RecursionError):
            return _error(400, "invalid_intelligence_request", "Invalid reasoning request")
        except PermissionError:
            return _error(403, "operation_denied", "Operation not permitted")
        except RuntimeError:
            return _error(503, "intelligence_unavailable", "Intelligence service unavailable")
        return _json(result)

    async def intelligence_respond_v2(request: web.Request) -> web.Response:
        nonlocal active_intelligence_requests
        if intelligence_v2_adapter is None or not intelligence_v2_adapter.enabled:
            return _error(404, "not_found", "Resource not found")
        owner = await authenticated_owner(request)
        if owner is None:
            return unauthorized()
        if request.content_type != "application/json":
            return _error(415, "unsupported_media_type", "Use application/json")
        try:
            payload = json.loads((await request.read()).decode("utf-8"),
                                 object_pairs_hook=_strict_json_pairs,
                                 parse_constant=_reject_json_constant)
            scope = "u_" + hashlib.sha256(owner.encode("utf-8")).hexdigest()[:62]
            permissions = public_operations if v2_permissions is None else v2_permissions.get(owner, frozenset())
            if not permissions:
                return _error(403, "operation_denied", "Operation not permitted")
            principal = RouterPrincipal(scope, permissions)
            if active_intelligence_requests >= min(max_concurrent_messages, 8):
                return _error(503, "intelligence_unavailable", "Intelligence service unavailable")
            active_intelligence_requests += 1
            def release(task):
                nonlocal active_intelligence_requests
                active_intelligence_requests -= 1
                if not task.cancelled():
                    task.exception()
            try:
                task = asyncio.create_task(asyncio.to_thread(intelligence_v2_adapter.respond, principal, payload))
            except BaseException:
                active_intelligence_requests -= 1
                raise
            task.add_done_callback(release)
            result = await asyncio.shield(task)
        except (ValueError, TypeError, UnicodeError, RecursionError):
            return _error(400, "invalid_intelligence_request", "Invalid V2 request")
        except PermissionError:
            return _error(403, "operation_denied", "Operation not permitted")
        except RuntimeError:
            return _error(503, "intelligence_unavailable", "Intelligence service unavailable")
        return _json(result)

    async def submit_feedback(request: web.Request) -> web.Response:
        owner = await authenticated_owner(request)
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
        owner = await authenticated_owner(request)
        if owner is None:
            return unauthorized()
        try:
            pending = await asyncio.to_thread(feedback_store.pending_ids, owner, limit=100)
        except ValueError:
            return _error(400, "invalid_learning_feedback_query", "Invalid feedback query")
        return _json({"pending": list(pending)})

    async def learning_status(request: web.Request) -> web.Response:
        owner = await authenticated_owner(request)
        if owner is None:
            return unauthorized()
        try:
            counts = await asyncio.to_thread(feedback_store.counts, owner)
        except (AttributeError, ValueError):
            return _error(503, "learning_status_unavailable", "Learning status is temporarily unavailable")

        minimum = 5
        owner_scope = hashlib.sha256(owner.encode("utf-8")).hexdigest()
        worker = None
        if learning_status_dir is not None:
            status_path = learning_status_dir / f"status-{owner_scope}.json"
            try:
                parsed = json.loads(status_path.read_text(encoding="utf-8"))
                if (
                    isinstance(parsed, dict)
                    and parsed.get("format") == "xsus-en-learning-worker-status-v1"
                    and parsed.get("owner_scope") == owner_scope
                ):
                    worker = parsed
            except (OSError, UnicodeError, json.JSONDecodeError):
                worker = None

        allowed_states = {
            "training", "candidate_ready", "candidate_blocked", "blocked", "failed",
        }
        state = worker.get("status") if isinstance(worker, dict) else None
        if state not in allowed_states:
            state = "waiting_for_feedback" if counts.get("accepted", 0) < minimum else "queued_for_learning"
        candidate_revision = worker.get("candidate_revision") if isinstance(worker, dict) else None
        if not isinstance(candidate_revision, str) or len(candidate_revision) > 128:
            candidate_revision = None
        updated_at = worker.get("updated_at") if isinstance(worker, dict) else None
        if not isinstance(updated_at, str) or len(updated_at) > 64:
            updated_at = None
        return _json({
            "language": "en",
            "status": state,
            "accepted_examples": counts.get("accepted", 0),
            "pending_examples": counts.get("pending", 0),
            "minimum_approved_examples": minimum,
            "worker_updated_at": updated_at,
            "candidate_revision": candidate_revision,
            "eligible_for_promotion": (
                worker.get("eligible_for_promotion") is True if isinstance(worker, dict) else False
            ),
            "requires_human_release": True,
        })

    async def get_feedback(request: web.Request) -> web.Response:
        owner = await authenticated_owner(request)
        if owner is None:
            return unauthorized()
        try:
            record = await asyncio.to_thread(feedback_store.get, owner, request.match_info["example_id"])
        except KeyError:
            return _error(404, "feedback_not_found", "Learning feedback not found")
        except ValueError:
            return _error(400, "invalid_learning_feedback_id", "Invalid learning feedback ID")
        example = record.example
        return _json({
            "example_id": record.example_id,
            "status": record.status,
            "submitted_at": record.submitted_at,
            "prompt": example.conversation.text,
            "history": [{"role": turn.role.value, "text": turn.text} for turn in example.conversation.history],
            "response": example.response,
        })

    async def review_feedback(request: web.Request) -> web.Response:
        owner = await authenticated_owner(request)
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
        owner = await authenticated_owner(request)
        if owner is None:
            return unauthorized()
        removed = await asyncio.to_thread(feedback_store.forget, owner, request.match_info["example_id"])
        if not removed:
            return _error(404, "feedback_not_found", "Learning feedback not found")
        return web.Response(status=204, headers={"Cache-Control": "no-store"})

    app = web.Application(client_max_size=_MAX_BODY_BYTES, middlewares=[intelligence_monitor, cors_boundary, boundary])
    app[INTELLIGENCE_METRICS] = metrics
    if owner_authenticator is not None:
        start = getattr(owner_authenticator, "start", None)
        close = getattr(owner_authenticator, "close", None)
        if callable(start):
            app.on_startup.append(start)
        if callable(close):
            app.on_cleanup.append(close)
    resource = r"/v1/sessions/{session_id:[A-Za-z0-9][A-Za-z0-9._-]{0,127}}"
    app.router.add_get("/healthz", health)
    app.router.add_route("OPTIONS", r"/{tail:.*}", options)
    app.router.add_post("/v1/sessions", create)
    app.router.add_get("/v1/sessions", list_sessions, allow_head=False)
    app.router.add_get(resource, get, allow_head=False)
    app.router.add_delete(resource, delete)
    app.router.add_post(resource + "/messages", send)
    app.router.add_post("/v1/language/proofread", proofread)
    app.router.add_post("/v1/language/analyze/sq", albanian_analyze)
    app.router.add_post("/v1/intelligence/reason", intelligence_reason)
    app.router.add_post("/v2/intelligence/respond", intelligence_respond_v2)
    if feedback_store is not None:
        app.router.add_post("/v1/learning/feedback", submit_feedback)
        app.router.add_get("/v1/learning/feedback", list_feedback, allow_head=False)
        app.router.add_get("/v1/learning/status", learning_status, allow_head=False)
        app.router.add_get(
            r"/v1/learning/feedback/{example_id:[0-9a-f]{64}}", get_feedback, allow_head=False,
        )
        app.router.add_post(
            r"/v1/learning/feedback/{example_id:[0-9a-f]{64}}/{decision:accept|reject}", review_feedback,
        )
        app.router.add_delete(r"/v1/learning/feedback/{example_id:[0-9a-f]{64}}", forget_feedback)
    return app
