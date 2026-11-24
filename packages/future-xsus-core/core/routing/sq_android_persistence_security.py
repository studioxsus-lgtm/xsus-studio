"""Persistence and security requirements; no database or security enforcement."""
from dataclasses import dataclass
from languages.sq.database_requests import DatabaseSpec
from languages.sq.project_context import ProjectContext
from core.routing.sq_android_functional import FunctionalPlan, prepare_functional_plan

@dataclass(frozen=True, slots=True)
class PersistenceSecurityPlan:
    functional: FunctionalPlan
    storage: tuple[str, ...]
    database: tuple[DatabaseSpec, ...]
    requested_controls: tuple[str, ...]
    suggested_controls: tuple[str, ...]
    permissions: tuple[str, ...]
    unresolved: tuple[str, ...]
    required_files: tuple[str, ...]
    execution_authorized: bool = False

def prepare_persistence_security(context: ProjectContext, application_id: str, display_name: str, min_sdk: int = 26) -> PersistenceSecurityPlan:
    functional = prepare_functional_plan(context, application_id, display_name, min_sdk)
    features = functional.ui.android.features
    storage = ["datastore_preferences"]
    issues = list(functional.unresolved_features)
    if context.database or "database" in features or "task_management" in features:
        storage.append("room")
    tables = {spec.table for spec in context.database if spec.columns}
    for spec in context.database:
        if spec.table not in tables:
            issues.append("missing_schema:" + spec.table)
        if spec.related_table and spec.related_table not in tables:
            issues.append("missing_schema:" + spec.related_table)
        if spec.columns:
            issues.append("primary_key_review:" + spec.table)
        if spec.relationship:
            issues.append("foreign_key_review:" + spec.table)
    requested = context.security.requested if context.security else ()
    suggested = list(context.security.suggested_controls if context.security else ())
    if "authentication" in features and "authentication" not in requested:
        suggested.append("authentication")
    controls = set(requested) | set(suggested)
    if "authentication" in controls:
        issues.append("authentication_provider_required")
    if "encryption_at_rest" in controls:
        issues.append("encrypted_storage_configuration_required")
    if controls & {"authorization","role_based_access","data_isolation","rate_limiting"}:
        issues.append("authorization_boundary_review")
    permissions = ("android.permission.POST_NOTIFICATIONS",) if "notifications" in features else ()
    source = "app/src/main/java/" + application_id.replace(".", "/")
    extra = ["/data/PreferencesStore.kt","/security/SecurityPolicy.kt","/security/PermissionPolicy.kt"]
    if "room" in storage:
        extra.extend(("/data/local/AppDatabase.kt","/data/local/DatabaseMigrations.kt"))
    if "authentication" in controls:
        extra.append("/security/SessionRepository.kt")
    return PersistenceSecurityPlan(functional, tuple(storage), context.database, requested,
        tuple(dict.fromkeys(suggested)), permissions, tuple(dict.fromkeys(issues)),
        functional.required_files + tuple(source + path for path in extra))
