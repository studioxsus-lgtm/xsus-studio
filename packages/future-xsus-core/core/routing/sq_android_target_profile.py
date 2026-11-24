"""Explicit target profile for the current native Android task generator."""
from dataclasses import replace
from core.routing.sq_android_persistence_security import PersistenceSecurityPlan

def prepare_atomic_json_profile(plan: PersistenceSecurityPlan, *, accept_storage_profile: bool = False) -> PersistenceSecurityPlan:
    if not isinstance(plan, PersistenceSecurityPlan):
        raise TypeError("Expected persistence plan")
    if accept_storage_profile is not True:
        raise ValueError("Explicit storage profile acceptance required")
    ui = plan.functional.ui
    features = set(ui.android.features)
    if ("task_management" not in features or not features <= {"task_management", "search", "filter"}
        or plan.unresolved or plan.database or plan.requested_controls or plan.suggested_controls or plan.permissions
        or plan.execution_authorized is not False):
        raise ValueError("Unsupported requirements")
    if (ui.navigation != "single_screen" or ui.style != "modern" or ui.motion != "system"
        or ui.adaptive_layout or ui.typography != "material_default"):
        raise ValueError("Unsupported design")
    source = "app/src/main/java/" + ui.android.application_id.replace(".", "/")
    files = tuple(dict.fromkeys(ui.android.required_files + (
        source + "/ui/AppScreen.kt", source + "/data/Task.kt", source + "/data/TaskStore.kt")))
    return replace(plan, storage=("atomic_json",), required_files=files)
