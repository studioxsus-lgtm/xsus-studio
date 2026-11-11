"""Choose among compatible engine replicas using fresh latency and load data."""

from collections.abc import Iterable, Iterator
from dataclasses import dataclass

from ..contracts.engine import EngineIdentity, EngineInstance
from ..contracts.request import EngineRequest
from ..registry.engine_registry import EngineRegistry
from .metrics import RoutingMetrics


@dataclass(frozen=True, slots=True)
class RouteCandidate:
    instance: EngineInstance
    estimated_delay_us: int | None


def _priority(candidate: RouteCandidate) -> tuple[bool, int, str]:
    estimate = candidate.estimated_delay_us
    return estimate is None, estimate or 0, candidate.instance.instance_id


class RequestRouter:
    def __init__(self, registry: EngineRegistry, metrics: RoutingMetrics) -> None:
        self._registry = registry
        self._metrics = metrics

    def select(
        self,
        request: EngineRequest,
        *,
        engine: EngineIdentity | None = None,
        exclude_instance_ids: Iterable[str] = (),
    ) -> RouteCandidate | None:
        """Find the first choice without sorting the candidate list."""
        options = self._options(request, engine=engine, exclude_instance_ids=exclude_instance_ids)
        return min(options, key=_priority, default=None)

    def rank(
        self,
        request: EngineRequest,
        *,
        engine: EngineIdentity | None = None,
        exclude_instance_ids: Iterable[str] = (),
    ) -> tuple[RouteCandidate, ...]:
        """Return all eligible choices in priority order."""
        options = self._options(request, engine=engine, exclude_instance_ids=exclude_instance_ids)
        return tuple(sorted(options, key=_priority))

    def _options(
        self,
        request: EngineRequest,
        *,
        engine: EngineIdentity | None,
        exclude_instance_ids: Iterable[str],
    ) -> Iterator[RouteCandidate]:
        replicas = self._registry.candidates(
            request, engine=engine, exclude_instance_ids=exclude_instance_ids, ordered=False
        )
        if not replicas:
            return
        observations = self._metrics.snapshot(replica.instance_id for replica in replicas)
        for replica in replicas:
            metrics = observations.get(replica.instance_id)
            if metrics is None:
                yield RouteCandidate(replica, estimated_delay_us=None)
                continue
            remaining = metrics.capacity - metrics.in_flight
            if remaining > 0:
                # Integer ceiling keeps the ordering deterministic across processes.
                estimate = (metrics.latency_us * metrics.capacity + remaining - 1) // remaining
                yield RouteCandidate(replica, estimated_delay_us=estimate)
