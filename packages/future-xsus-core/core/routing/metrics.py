"""Store recent latency and load observations for running engine instances."""

from collections.abc import Callable, Iterable
from dataclasses import dataclass
from threading import Lock
from time import monotonic_ns

from ..contracts.common import require_identifier

_NS_PER_MS = 1_000_000


@dataclass(frozen=True, slots=True)
class InstanceMetrics:
    latency_us: int
    in_flight: int
    capacity: int

    def __post_init__(self) -> None:
        if type(self.latency_us) is not int or self.latency_us <= 0:
            raise ValueError("latency_us must be a positive integer")
        if type(self.in_flight) is not int or self.in_flight < 0:
            raise ValueError("in_flight must be a nonnegative integer")
        if type(self.capacity) is not int or self.capacity <= 0:
            raise ValueError("capacity must be a positive integer")


@dataclass(frozen=True, slots=True)
class _Observation:
    metrics: InstanceMetrics
    observed_at_ns: int


class RoutingMetrics:
    def __init__(
        self,
        *,
        ttl_ms: int = 5_000,
        clock_ns: Callable[[], int] = monotonic_ns,
    ) -> None:
        if type(ttl_ms) is not int or ttl_ms <= 0:
            raise ValueError("ttl_ms must be a positive integer")
        self._ttl_ns = ttl_ms * _NS_PER_MS
        self._clock_ns = clock_ns
        self._observations: dict[str, _Observation] = {}
        self._lock = Lock()

    def record(
        self,
        instance_id: str,
        metrics: InstanceMetrics,
        *,
        observed_at_ns: int | None = None,
    ) -> bool:
        """Record a newer observation from the same local monotonic clock."""
        require_identifier(instance_id, "instance_id")
        if not isinstance(metrics, InstanceMetrics):
            raise TypeError("metrics must be an InstanceMetrics value")
        with self._lock:
            now = self._clock_ns()
            observed_at = now if observed_at_ns is None else observed_at_ns
            if type(observed_at) is not int or observed_at < 0 or observed_at > now:
                raise ValueError("observed_at_ns must be a timestamp from the local monotonic clock")
            current = self._observations.get(instance_id)
            if current is not None and observed_at <= current.observed_at_ns:
                return False
            self._observations[instance_id] = _Observation(metrics, observed_at)
            return True

    def snapshot(self, instance_ids: Iterable[str]) -> dict[str, InstanceMetrics]:
        """Return fresh observations for the requested IDs only."""
        ids = tuple(instance_ids)
        with self._lock:
            fresh_after = self._clock_ns() - self._ttl_ns
            return {
                instance_id: observation.metrics
                for instance_id in ids
                if (observation := self._observations.get(instance_id)) is not None
                and observation.observed_at_ns > fresh_after
            }

    def forget(self, instance_id: str) -> bool:
        """Remove measurements when an instance leaves the registry."""
        with self._lock:
            return self._observations.pop(instance_id, None) is not None
