"""JSON representation of the engine contract for the HTTP transport."""

import base64
import json
from typing import Any

from ..contracts.common import Audio, Capability, ContractVersion, LanguageTag
from ..contracts.engine import EngineIdentity, EngineInstance
from ..contracts.errors import EngineError, ErrorCode
from ..contracts.request import (
    Conversation, ConversationRole, ConversationTurn, EngineRequest,
    SpeechSynthesis, Transcription, Translation,
)
from ..contracts.response import AudioResult, EngineResponse, TextResult, TranscriptResult


def _object(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("Expected a JSON object")
    return value


def _encode(value: dict[str, Any]) -> bytes:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def _version(version: ContractVersion) -> dict[str, int]:
    return {"major": version.major, "minor": version.minor}


def _read_version(value: Any) -> ContractVersion:
    version = _object(value)
    return ContractVersion(version["major"], version["minor"])


def _instance(instance: EngineInstance) -> dict[str, Any]:
    return {
        "instance_id": instance.instance_id,
        "engine_id": instance.engine.engine_id,
        "revision": instance.engine.revision,
        "contract": _version(instance.engine.contract),
    }


def _read_instance(value: Any) -> EngineInstance:
    instance = _object(value)
    identity = EngineIdentity(instance["engine_id"], instance["revision"], _read_version(instance["contract"]))
    return EngineInstance(identity, instance["instance_id"])


def _audio(audio: Audio) -> dict[str, str]:
    return {"media_type": audio.media_type, "base64": base64.b64encode(audio.data).decode("ascii")}


def _read_audio(value: Any) -> Audio:
    audio = _object(value)
    encoded = audio["base64"]
    if not isinstance(encoded, str):
        raise ValueError("Expected a base64 audio string")
    return Audio(base64.b64decode(encoded, validate=True), audio["media_type"])


def encode_request(request: EngineRequest, instance: EngineInstance) -> bytes:
    operation = request.operation
    payload: dict[str, Any] = {"kind": operation.capability.value}
    if isinstance(operation, Conversation):
        payload.update(
            text=operation.text,
            history=[{"role": turn.role.value, "text": turn.text} for turn in operation.history],
        )
    elif isinstance(operation, Translation):
        payload.update(text=operation.text, target=operation.target.value)
    elif isinstance(operation, Transcription):
        payload["audio"] = _audio(operation.audio)
    else:
        payload.update(text=operation.text, voice_id=operation.voice_id)
    return _encode({
        "request_id": request.request_id,
        "attempt_id": request.attempt_id,
        "contract": _version(request.contract),
        "language": request.language.value,
        "deadline_unix_ms": request.deadline_unix_ms,
        "instance": _instance(instance),
        "operation": payload,
    })


def decode_request(raw: bytes) -> tuple[EngineRequest, EngineInstance]:
    body = _object(json.loads(raw.decode("utf-8")))
    payload = _object(body["operation"])
    capability = Capability(payload["kind"])
    operation: Conversation | Translation | Transcription | SpeechSynthesis
    if capability is Capability.CONVERSATION:
        history = payload["history"]
        if not isinstance(history, list):
            raise ValueError("Conversation history must be a JSON array")
        turns = (_object(turn) for turn in history)
        operation = Conversation(
            payload["text"],
            tuple(ConversationTurn(ConversationRole(turn["role"]), turn["text"]) for turn in turns),
        )
    elif capability is Capability.TRANSLATION:
        operation = Translation(payload["text"], LanguageTag(payload["target"]))
    elif capability is Capability.TRANSCRIPTION:
        operation = Transcription(_read_audio(payload["audio"]))
    else:
        operation = SpeechSynthesis(payload["text"], payload.get("voice_id"))
    return EngineRequest(
        body["request_id"], body["attempt_id"], _read_version(body["contract"]),
        LanguageTag(body["language"]), body["deadline_unix_ms"], operation,
    ), _read_instance(body["instance"])


def encode_response(response: EngineResponse) -> bytes:
    outcome = response.outcome
    if isinstance(outcome, EngineError):
        payload = {"kind": "error", "code": outcome.code.value, "message": outcome.message}
    elif isinstance(outcome, AudioResult):
        payload = {"kind": "audio", "language": outcome.language.value, "audio": _audio(outcome.audio)}
    else:
        kind = "transcript" if isinstance(outcome, TranscriptResult) else "text"
        payload = {"kind": kind, "language": outcome.language.value, "text": outcome.text}
    return _encode({
        "request_id": response.request_id,
        "attempt_id": response.attempt_id,
        "instance": _instance(response.instance),
        "outcome": payload,
    })


def decode_response(raw: bytes) -> EngineResponse:
    body = _object(json.loads(raw.decode("utf-8")))
    payload = _object(body["outcome"])
    outcome: AudioResult | TextResult | TranscriptResult | EngineError
    match payload["kind"]:
        case "error":
            outcome = EngineError(ErrorCode(payload["code"]), payload["message"])
        case "audio":
            outcome = AudioResult(_read_audio(payload["audio"]), LanguageTag(payload["language"]))
        case "transcript":
            outcome = TranscriptResult(payload["text"], LanguageTag(payload["language"]))
        case "text":
            outcome = TextResult(payload["text"], LanguageTag(payload["language"]))
        case _:
            raise ValueError("Unknown engine outcome")
    return EngineResponse(body["request_id"], body["attempt_id"], _read_instance(body["instance"]), outcome)
