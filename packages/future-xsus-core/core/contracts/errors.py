"""Stable error codes and their eligibility for routing to another instance."""

from dataclasses import dataclass
from enum import StrEnum

from .common import require_text


class ErrorCode(StrEnum):
    INVALID_REQUEST = "invalid_request"
    INCOMPATIBLE_CONTRACT = "incompatible_contract"
    UNSUPPORTED_LANGUAGE = "unsupported_language"
    UNSUPPORTED_CAPABILITY = "unsupported_capability"
    UNSUPPORTED_TRANSLATION_TARGET = "unsupported_translation_target"
    UNSUPPORTED_AUDIO_FORMAT = "unsupported_audio_format"
    UNKNOWN_VOICE = "unknown_voice"
    CANCELLED = "cancelled"
    DEADLINE_EXCEEDED = "deadline_exceeded"
    INSTANCE_UNAVAILABLE = "instance_unavailable"
    INSTANCE_OVERLOADED = "instance_overloaded"
    INSTANCE_TIMEOUT = "instance_timeout"
    INTERNAL = "internal"


@dataclass(frozen=True, slots=True)
class EngineError:
    code: ErrorCode
    message: str

    def __post_init__(self) -> None:
        if not isinstance(self.code, ErrorCode):
            raise ValueError("Invalid engine error code")
        require_text(self.message, "error message")

    @property
    def allows_alternate_instance(self) -> bool:
        return self.code in {
            ErrorCode.INSTANCE_UNAVAILABLE,
            ErrorCode.INSTANCE_OVERLOADED,
            ErrorCode.INSTANCE_TIMEOUT,
        }
