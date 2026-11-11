"""Shared value types for the engine contract."""

import re
from dataclasses import dataclass
from enum import StrEnum


class Capability(StrEnum):
    CONVERSATION = "conversation"
    TRANSLATION = "translation"
    TRANSCRIPTION = "transcription"
    SPEECH_SYNTHESIS = "speech_synthesis"


def require_text(value: str, field: str) -> None:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must contain text")


def require_identifier(value: str, field: str) -> None:
    if not isinstance(value, str) or re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", value) is None:
        raise ValueError(f"{field} must be a 1–128 character identifier")


@dataclass(frozen=True, slots=True, order=True)
class ContractVersion:
    major: int
    minor: int

    def __post_init__(self) -> None:
        if type(self.major) is not int or type(self.minor) is not int:
            raise ValueError("Contract version components must be integers")
        if self.major < 1 or self.minor < 0:
            raise ValueError("Contract version requires major >= 1 and minor >= 0")

    def supports(self, requested: "ContractVersion") -> bool:
        return self.major == requested.major and self.minor >= requested.minor


V1 = ContractVersion(1, 0)

_LANGUAGE_TAG = re.compile(
    r"[a-z]{2,8}(?:-[a-z]{4})?(?:-(?:[a-z]{2}|[0-9]{3}))?"
    r"(?:-(?:[a-z0-9]{5,8}|[0-9][a-z0-9]{3}))*",
    re.IGNORECASE | re.ASCII,
)


@dataclass(frozen=True, slots=True)
class LanguageTag:
    """Canonical key for a primary language with optional script, region and variants."""

    value: str

    def __post_init__(self) -> None:
        if not isinstance(self.value, str) or _LANGUAGE_TAG.fullmatch(self.value) is None:
            raise ValueError("Invalid language tag")
        parts = self.value.lower().split("-")
        variants = [part for part in parts[1:] if len(part) >= 5 or (len(part) == 4 and part[0].isdigit())]
        if len(variants) != len(set(variants)):
            raise ValueError("Duplicate language variant")
        object.__setattr__(self, "value", "-".join(parts))

    @property
    def primary(self) -> str:
        return self.value.split("-", 1)[0]


@dataclass(frozen=True, slots=True)
class Audio:
    data: bytes
    media_type: str

    def __post_init__(self) -> None:
        if not isinstance(self.data, bytes) or not self.data:
            raise ValueError("Audio data must be nonempty bytes")
        require_audio_type(self.media_type)


def require_audio_type(value: str) -> None:
    if not isinstance(value, str) or re.fullmatch(r"audio/[a-z0-9][a-z0-9.+-]*", value) is None:
        raise ValueError("Expected a lowercase audio media type")
