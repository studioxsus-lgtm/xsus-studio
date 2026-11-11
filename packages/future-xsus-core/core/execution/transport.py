"""Boundary for calling a selected engine instance."""

from typing import Protocol

from ..contracts.engine import EngineInstance
from ..contracts.request import EngineRequest
from ..contracts.response import EngineResponse


class EngineTransport(Protocol):
    async def invoke(self, instance: EngineInstance, request: EngineRequest) -> EngineResponse: ...
