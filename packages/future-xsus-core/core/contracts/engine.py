"""Engine identity, capability advertisement, and the asynchronous interface."""

from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol

from .common import Capability, ContractVersion, LanguageTag, require_audio_type, require_identifier
from .request import EngineRequest, SpeechSynthesis, Transcription, Translation

if TYPE_CHECKING:
    from .response import EngineResponse


@dataclass(frozen=True, slots=True)
class EngineIdentity:
    engine_id: str
    revision: str
    contract: ContractVersion

    def __post_init__(self) -> None:
        require_identifier(self.engine_id, "engine_id")
        require_identifier(self.revision, "revision")
        if not isinstance(self.contract, ContractVersion):
            raise ValueError("Engine requires a contract version")


@dataclass(frozen=True, slots=True)
class EngineInstance:
    engine: EngineIdentity
    instance_id: str

    def __post_init__(self) -> None:
        require_identifier(self.instance_id, "instance_id")
        if not isinstance(self.engine, EngineIdentity):
            raise ValueError("Instance requires an engine identity")


@dataclass(frozen=True, slots=True)
class LanguageSupport:
    language: LanguageTag
    capabilities: frozenset[Capability]
    translation_targets: frozenset[LanguageTag] = frozenset()
    transcription_formats: frozenset[str] = frozenset()
    voice_ids: frozenset[str] = frozenset()

    def __post_init__(self) -> None:
        if not isinstance(self.language, LanguageTag):
            raise ValueError("Language support requires a language tag")
        if not isinstance(self.capabilities, frozenset) or not all(
            isinstance(capability, Capability) for capability in self.capabilities
        ):
            raise ValueError("Capabilities must be a frozen set of capability values")
        if not isinstance(self.translation_targets, frozenset) or not all(
            isinstance(target, LanguageTag) for target in self.translation_targets
        ):
            raise ValueError("Translation targets must be a frozen set of language tags")
        if self.language in self.translation_targets:
            raise ValueError("Translation targets must differ from the source")
        if bool(self.translation_targets) != (Capability.TRANSLATION in self.capabilities):
            raise ValueError("Translation requires an explicit set of target languages")
        if not isinstance(self.transcription_formats, frozenset):
            raise ValueError("Transcription formats must be a frozen set")
        if bool(self.transcription_formats) != (Capability.TRANSCRIPTION in self.capabilities):
            raise ValueError("Transcription requires an explicit set of audio formats")
        for media_type in self.transcription_formats:
            require_audio_type(media_type)
        if not isinstance(self.voice_ids, frozenset):
            raise ValueError("Voice identifiers must be a frozen set")
        if self.voice_ids and Capability.SPEECH_SYNTHESIS not in self.capabilities:
            raise ValueError("Named voices require speech synthesis support")
        for voice_id in self.voice_ids:
            require_identifier(voice_id, "voice_id")

    def accepts(self, request: EngineRequest) -> bool:
        operation = request.operation
        if self.language != request.language or operation.capability not in self.capabilities:
            return False
        if isinstance(operation, Translation):
            return operation.target in self.translation_targets
        if isinstance(operation, Transcription):
            return operation.audio.media_type in self.transcription_formats
        if isinstance(operation, SpeechSynthesis):
            return operation.voice_id is None or operation.voice_id in self.voice_ids
        return True


@dataclass(frozen=True, slots=True)
class EngineDescriptor:
    identity: EngineIdentity
    languages: tuple[LanguageSupport, ...]

    def __post_init__(self) -> None:
        if not isinstance(self.identity, EngineIdentity):
            raise ValueError("Descriptor requires an engine identity")
        if not isinstance(self.languages, tuple) or not self.languages or not all(
            isinstance(support, LanguageSupport) for support in self.languages
        ):
            raise ValueError("Descriptor requires an ordered tuple of supported language entries")
        tags = {support.language for support in self.languages}
        if len(tags) != len(self.languages):
            raise ValueError("Descriptor has duplicate language entries")
        if len({tag.primary for tag in tags}) != 1:
            raise ValueError("An engine may advertise only one primary language")

    def accepts(self, request: EngineRequest) -> bool:
        return self.identity.contract.supports(request.contract) and any(
            support.accepts(request) for support in self.languages
        )


class LanguageEngine(Protocol):
    @property
    def descriptor(self) -> EngineDescriptor: ...

    @property
    def instance(self) -> EngineInstance: ...

    async def execute(self, request: EngineRequest) -> "EngineResponse": ...
