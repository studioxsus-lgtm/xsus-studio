"""Dispatch requests to engines running in the current process."""

from collections.abc import Iterable

from ..contracts.engine import EngineInstance, LanguageEngine
from ..contracts.errors import EngineError, ErrorCode
from ..contracts.request import EngineRequest
from ..contracts.response import EngineResponse


class LocalEngineTransport:
    def __init__(self, engines: Iterable[LanguageEngine]) -> None:
        self._engines: dict[EngineInstance, LanguageEngine] = {}
        instance_ids: set[str] = set()
        for engine in engines:
            instance = engine.instance
            if engine.descriptor.identity != instance.engine:
                raise ValueError("Local engine descriptor does not match its instance")
            if instance.instance_id in instance_ids:
                raise ValueError(f"Duplicate local instance ID: {instance.instance_id}")
            instance_ids.add(instance.instance_id)
            self._engines[instance] = engine

    async def invoke(self, instance: EngineInstance, request: EngineRequest) -> EngineResponse:
        engine = self._engines.get(instance)
        if engine is None:
            return EngineResponse(
                request.request_id,
                request.attempt_id,
                instance,
                EngineError(ErrorCode.INSTANCE_UNAVAILABLE, "Selected local engine is not attached"),
            )
        return await engine.execute(request)
