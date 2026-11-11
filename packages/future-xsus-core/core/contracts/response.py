"""Result types and checks at the engine-to-core boundary."""

from dataclasses import dataclass

from .common import Audio, LanguageTag, require_identifier, require_text
from .engine import EngineInstance
from .errors import EngineError
from .request import EngineRequest, SpeechSynthesis, Transcription, Translation


@dataclass(frozen=True, slots=True)
class TextResult:
    text: str
    language: LanguageTag

    def __post_init__(self) -> None:
        require_text(self.text, "result text")
        if not isinstance(self.language, LanguageTag):
            raise ValueError("Text result requires a language tag")


@dataclass(frozen=True, slots=True)
class AudioResult:
    audio: Audio
    language: LanguageTag

    def __post_init__(self) -> None:
        if not isinstance(self.audio, Audio) or not isinstance(self.language, LanguageTag):
            raise ValueError("Audio result requires audio and a language tag")


@dataclass(frozen=True, slots=True)
class TranscriptResult:
    text: str
    language: LanguageTag

    def __post_init__(self) -> None:
        if not isinstance(self.text, str) or (self.text and not self.text.strip()):
            raise ValueError("A transcript must contain text or be empty when no speech was recognized")
        if not isinstance(self.language, LanguageTag):
            raise ValueError("Transcript requires a language tag")


@dataclass(frozen=True, slots=True)
class EngineResponse:
    request_id: str
    attempt_id: str
    instance: EngineInstance
    outcome: TextResult | AudioResult | TranscriptResult | EngineError

    def __post_init__(self) -> None:
        require_identifier(self.request_id, "request_id")
        require_identifier(self.attempt_id, "attempt_id")
        if not isinstance(self.instance, EngineInstance):
            raise ValueError("Response requires an instance identity")
        if not isinstance(self.outcome, (TextResult, AudioResult, TranscriptResult, EngineError)):
            raise ValueError("Response requires one result or error")

    def validate_for(self, request: EngineRequest, expected_instance: EngineInstance) -> None:
        if (self.request_id, self.attempt_id) != (request.request_id, request.attempt_id):
            raise ValueError("Response belongs to a different request or attempt")
        if self.instance != expected_instance:
            raise ValueError("Response belongs to a different engine instance")
        if isinstance(self.outcome, EngineError):
            return
        operation = request.operation
        if isinstance(operation, SpeechSynthesis):
            if not isinstance(self.outcome, AudioResult) or self.outcome.language != request.language:
                raise ValueError("Speech synthesis must return audio in the requested language")
        elif isinstance(operation, Transcription):
            if not isinstance(self.outcome, TranscriptResult) or self.outcome.language != request.language:
                raise ValueError("Transcription must return a transcript in the requested language")
        else:
            expected_language = operation.target if isinstance(operation, Translation) else request.language
            if not isinstance(self.outcome, TextResult) or self.outcome.language != expected_language:
                raise ValueError("Operation must return text in the expected language")
