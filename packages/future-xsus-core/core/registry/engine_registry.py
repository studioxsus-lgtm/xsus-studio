"""Thread-safe, in-process registry with indexed candidate discovery."""

from collections.abc import Iterable
from threading import Lock

from ..contracts.common import Capability, LanguageTag
from ..contracts.engine import EngineDescriptor, EngineIdentity, EngineInstance
from ..contracts.request import EngineRequest
from .errors import RegistrationConflict, UnknownEngine, UnknownInstance
from .instance import InstanceRecord, InstanceStatus

_Route = tuple[LanguageTag, Capability]
_Revision = tuple[str, str]


def _revision(identity: EngineIdentity) -> _Revision:
    return identity.engine_id, identity.revision


class EngineRegistry:
    def __init__(self) -> None:
        self._lock = Lock()
        self._engines: dict[_Revision, EngineDescriptor] = {}
        self._instances: dict[str, InstanceRecord] = {}
        self._ready: dict[_Route, dict[EngineIdentity, set[EngineInstance]]] = {}

    def register_engine(self, descriptor: EngineDescriptor) -> None:
        """Register an immutable descriptor. Repeating it is safe."""
        key = _revision(descriptor.identity)
        with self._lock:
            current = self._engines.get(key)
            if current is None:
                self._engines[key] = descriptor
            elif current != descriptor:
                raise RegistrationConflict(f"Engine revision already has a different descriptor: {key!r}")

    def register_instance(
        self,
        instance: EngineInstance,
        *,
        status: InstanceStatus = InstanceStatus.UNAVAILABLE,
    ) -> InstanceRecord:
        """Register a replica of a known revision without overwriting a live record."""
        self._validate_status(status)
        with self._lock:
            current = self._instances.get(instance.instance_id)
            if current is not None:
                if current.instance != instance:
                    raise RegistrationConflict(f"Instance ID is already in use: {instance.instance_id!r}")
                return current
            descriptor = self._engines.get(_revision(instance.engine))
            if descriptor is None:
                raise UnknownEngine(_revision(instance.engine))
            if descriptor.identity != instance.engine:
                raise RegistrationConflict("Instance identity does not match its registered engine revision")

            record = InstanceRecord(instance, status)
            self._instances[instance.instance_id] = record
            if status is InstanceStatus.READY:
                self._add_ready(instance, descriptor)
            return record

    def set_instance_status(self, instance_id: str, status: InstanceStatus) -> InstanceRecord:
        self._validate_status(status)
        with self._lock:
            current = self._instances.get(instance_id)
            if current is None:
                raise UnknownInstance(instance_id)
            if current.status is status:
                return current
            descriptor = self._engines[_revision(current.instance.engine)]
            if current.status is InstanceStatus.READY:
                self._remove_ready(current.instance, descriptor)
            if status is InstanceStatus.READY:
                self._add_ready(current.instance, descriptor)
            updated = InstanceRecord(current.instance, status)
            self._instances[instance_id] = updated
            return updated

    def unregister_instance(self, instance_id: str) -> bool:
        """Remove an instance and its indexed routes. Repeating removal is safe."""
        with self._lock:
            current = self._instances.pop(instance_id, None)
            if current is None:
                return False
            if current.status is InstanceStatus.READY:
                self._remove_ready(current.instance, self._engines[_revision(current.instance.engine)])
            return True

    def candidates(
        self,
        request: EngineRequest,
        *,
        engine: EngineIdentity | None = None,
        exclude_instance_ids: Iterable[str] = (),
    ) -> tuple[EngineInstance, ...]:
        """Return a point-in-time snapshot, ordered by instance ID."""
        excluded = frozenset(exclude_instance_ids)
        route = (request.language, request.operation.capability)
        matches: list[EngineInstance] = []
        with self._lock:
            group = self._ready.get(route)
            if group is None:
                return ()
            identities = group if engine is None else (engine,)
            for identity in identities:
                replicas = group.get(identity)
                if replicas and self._engines[_revision(identity)].accepts(request):
                    matches.extend(replica for replica in replicas if replica.instance_id not in excluded)
        return tuple(sorted(matches, key=lambda replica: replica.instance_id))

    @staticmethod
    def _validate_status(status: InstanceStatus) -> None:
        if not isinstance(status, InstanceStatus):
            raise TypeError("Instance status must be an InstanceStatus value")

    def _add_ready(self, instance: EngineInstance, descriptor: EngineDescriptor) -> None:
        for language in descriptor.languages:
            for capability in language.capabilities:
                group = self._ready.setdefault((language.language, capability), {})
                group.setdefault(instance.engine, set()).add(instance)

    def _remove_ready(self, instance: EngineInstance, descriptor: EngineDescriptor) -> None:
        for language in descriptor.languages:
            for capability in language.capabilities:
                route = (language.language, capability)
                group = self._ready[route]
                replicas = group[instance.engine]
                replicas.remove(instance)
                if not replicas:
                    del group[instance.engine]
                if not group:
                    del self._ready[route]
