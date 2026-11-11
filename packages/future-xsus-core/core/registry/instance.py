"""The availability of one running language engine instance."""

from dataclasses import dataclass
from enum import StrEnum

from ..contracts.engine import EngineInstance


class InstanceStatus(StrEnum):
    UNAVAILABLE = "unavailable"
    READY = "ready"
    DRAINING = "draining"


@dataclass(frozen=True, slots=True)
class InstanceRecord:
    instance: EngineInstance
    status: InstanceStatus
