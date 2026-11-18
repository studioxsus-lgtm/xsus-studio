"""Connect the original XSUS English model to the language engine contract."""

import asyncio
import os
from pathlib import Path
from threading import Event

from core.contracts.common import Capability, LanguageTag, V1
from core.contracts.engine import EngineDescriptor, EngineIdentity, EngineInstance, LanguageSupport
from core.contracts.errors import EngineError, ErrorCode
from core.contracts.request import Conversation, EngineRequest
from core.contracts.response import EngineResponse, TextResult

from ..models.checkpoint import load_checkpoint
from ..models.profiles import load_profile
from ..text.generation.generate import generate

ENGLISH = LanguageTag("en")
DEFAULT_CHECKPOINT = Path(__file__).resolve().parents[1] / "models" / "checkpoints" / "xsus-en-seed-v1.json.gz"


class EnglishEngine:
    def __init__(self, checkpoint: Path | None, instance_id: str, *, profile: str | None = None) -> None:
        if profile is not None and checkpoint is not None:
            raise ValueError("Choose an English model profile or a checkpoint path")
        if profile is not None:
            self._tokenizer, self._model, revision = load_profile(profile)
        else:
            self._tokenizer, self._model, revision = load_checkpoint(
                DEFAULT_CHECKPOINT if checkpoint is None else checkpoint,
            )
        identity = EngineIdentity("xsus-en", revision, V1)
        self._descriptor = EngineDescriptor(
            identity, (LanguageSupport(ENGLISH, frozenset({Capability.CONVERSATION})),),
        )
        self._instance = EngineInstance(identity, instance_id)

    @property
    def descriptor(self) -> EngineDescriptor:
        return self._descriptor

    @property
    def instance(self) -> EngineInstance:
        return self._instance

    async def execute(self, request: EngineRequest) -> EngineResponse:
        operation = request.operation
        outcome: TextResult | EngineError
        if not isinstance(operation, Conversation) or not self.descriptor.accepts(request):
            outcome = EngineError(ErrorCode.INVALID_REQUEST, "Request is incompatible with the English engine")
        else:
            stop = Event()
            try:
                text = await asyncio.to_thread(generate, self._tokenizer, self._model, operation, stop=stop)
            except asyncio.CancelledError:
                stop.set()
                raise
            if text:
                outcome = TextResult(text, ENGLISH)
            else:
                outcome = EngineError(ErrorCode.INTERNAL, "The English model generated no text")
        return EngineResponse(request.request_id, request.attempt_id, self.instance, outcome)


def create_engine() -> EnglishEngine:
    checkpoint = os.environ.get("XSUS_EN_CHECKPOINT")
    profile = os.environ.get("XSUS_EN_MODEL_PROFILE")
    return EnglishEngine(
        Path(checkpoint) if checkpoint is not None else None,
        os.environ.get("XSUS_ENGINE_INSTANCE_ID", "en-local-1"),
        profile=profile,
    )
