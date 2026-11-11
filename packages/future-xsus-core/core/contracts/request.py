"""Typed operations and the request envelope passed to an engine."""

from dataclasses import dataclass
from enum import StrEnum
from typing import ClassVar

from .common import Audio, Capability, ContractVersion, LanguageTag, require_identifier, require_text


class ConversationRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"


@dataclass(frozen=True, slots=True)
class ConversationTurn:
    role: ConversationRole
    text: str

    def __post_init__(self) -> None:
        if not isinstance(self.role, ConversationRole):
            raise ValueError("Invalid conversation role")
        require_text(self.text, "turn text")


@dataclass(frozen=True, slots=True)
class Conversation:
    capability: ClassVar[Capability] = Capability.CONVERSATION
    text: str
    history: tuple[ConversationTurn, ...] = ()

    def __post_init__(self) -> None:
        require_text(self.text, "conversation text")
        if not isinstance(self.history, tuple) or not all(
            isinstance(turn, ConversationTurn) for turn in self.history
        ):
            raise ValueError("History must be an ordered tuple of conversation turns")


@dataclass(frozen=True, slots=True)
class Translation:
    capability: ClassVar[Capability] = Capability.TRANSLATION
    text: str
    target: LanguageTag

    def __post_init__(self) -> None:
        require_text(self.text, "translation text")
        if not isinstance(self.target, LanguageTag):
            raise ValueError("Translation target must be a language tag")


@dataclass(frozen=True, slots=True)
class Transcription:
    capability: ClassVar[Capability] = Capability.TRANSCRIPTION
    audio: Audio

    def __post_init__(self) -> None:
        if not isinstance(self.audio, Audio):
            raise ValueError("Transcription requires audio")


@dataclass(frozen=True, slots=True)
class SpeechSynthesis:
    capability: ClassVar[Capability] = Capability.SPEECH_SYNTHESIS
    text: str
    voice_id: str | None = None

    def __post_init__(self) -> None:
        require_text(self.text, "speech text")
        if self.voice_id is not None:
            require_identifier(self.voice_id, "voice_id")


Operation = Conversation | Translation | Transcription | SpeechSynthesis


@dataclass(frozen=True, slots=True)
class EngineRequest:
    request_id: str
    attempt_id: str
    contract: ContractVersion
    language: LanguageTag
    deadline_unix_ms: int
    operation: Operation

    def __post_init__(self) -> None:
        require_identifier(self.request_id, "request_id")
        require_identifier(self.attempt_id, "attempt_id")
        if not isinstance(self.contract, ContractVersion) or not isinstance(self.language, LanguageTag):
            raise ValueError("Request requires a contract version and language tag")
        if type(self.deadline_unix_ms) is not int or self.deadline_unix_ms <= 0:
            raise ValueError("Deadline must be a positive UTC Unix timestamp in milliseconds")
        if not isinstance(self.operation, (Conversation, Translation, Transcription, SpeechSynthesis)):
            raise ValueError("Unsupported request operation")
        if isinstance(self.operation, Translation) and self.language == self.operation.target:
            raise ValueError("Translation requires different source and target language tags")
