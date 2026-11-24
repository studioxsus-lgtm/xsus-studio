"""Immutable, caller-owned project specifications. No persistence or execution."""
from dataclasses import dataclass, replace
from .complex_requests import ApplicationRequirements, analyze_requirements
from .design_requests import DesignSpec, analyze_design
from .database_requests import DatabaseSpec, analyze_database
from .security_requests import SecuritySpec, analyze_security

@dataclass(frozen=True, slots=True)
class ProjectContext:
    project_id: str
    revision: int = 0
    application: ApplicationRequirements | None = None
    design: DesignSpec | None = None
    database: tuple[DatabaseSpec, ...] = ()
    security: SecuritySpec | None = None

@dataclass(frozen=True, slots=True)
class ProjectUpdate:
    context: ProjectContext
    status: str
    execution_authorized: bool = False

def update_project(context: ProjectContext, project_id: str, expected_revision: int, text: str) -> ProjectUpdate:
    if not isinstance(context, ProjectContext):
        raise TypeError("Expected ProjectContext")
    if not isinstance(project_id, str) or not project_id.strip() or len(project_id) > 128:
        raise ValueError("Invalid project identifier")
    if context.project_id != project_id:
        return ProjectUpdate(context, "project_mismatch")
    if type(expected_revision) is not int or expected_revision != context.revision:
        return ProjectUpdate(context, "revision_conflict")
    if not isinstance(text, str):
        raise TypeError("Expected text")
    if len(text) > 4096:
        return ProjectUpdate(context, "unresolved")
    matches = [(key, parser(text)) for key, parser in (
        ("application", analyze_requirements), ("design", analyze_design),
        ("database", analyze_database), ("security", analyze_security))]
    matches = [(key, value) for key, value in matches if value is not None]
    if len(matches) != 1:
        return ProjectUpdate(context, "unresolved")
    key, value = matches[0]
    if key == "application" and context.application is not None:
        old = context.application
        if old.platform and value.platform and old.platform != value.platform:
            return ProjectUpdate(context, "platform_conflict")
        value = replace(value, platform=value.platform or old.platform,
                        features=tuple(dict.fromkeys(old.features + value.features)))
    elif key == "database":
        if value in context.database:
            return ProjectUpdate(context, "unchanged")
        if len(context.database) >= 128:
            return ProjectUpdate(context, "capacity")
        if value.columns and any(item.table == value.table and item.columns for item in context.database):
            return ProjectUpdate(context, "schema_conflict")
        value = context.database + (value,)
    elif key == "security" and context.security is not None:
        old = context.security
        requested = tuple(dict.fromkeys(old.requested + value.requested))
        suggested = tuple(dep for dep in dict.fromkeys(old.suggested_controls + value.suggested_controls) if dep not in requested)
        value = SecuritySpec(requested, suggested)
    if getattr(context, key) == value:
        return ProjectUpdate(context, "unchanged")
    return ProjectUpdate(replace(context, revision=context.revision + 1, **{key: value}), "updated")
