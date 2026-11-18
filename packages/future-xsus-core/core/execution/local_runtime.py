"""Build the standard executor for engines running in the current process."""

from collections.abc import Iterable

from ..contracts.engine import LanguageEngine
from ..registry.engine_registry import EngineRegistry
from ..registry.instance import InstanceStatus
from ..routing.metrics import RoutingMetrics
from ..routing.request_router import RequestRouter
from .local_transport import LocalEngineTransport
from .request_executor import RequestExecutor


def create_local_executor(engines: Iterable[LanguageEngine]) -> RequestExecutor:
    instances = tuple(engines)
    transport = LocalEngineTransport(instances)
    registry = EngineRegistry()
    for engine in instances:
        registry.register_engine(engine.descriptor)
        registry.register_instance(engine.instance, status=InstanceStatus.READY)
    return RequestExecutor(RequestRouter(registry, RoutingMetrics()), transport)
