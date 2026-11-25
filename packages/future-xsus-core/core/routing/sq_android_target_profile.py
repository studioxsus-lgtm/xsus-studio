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
    tasks = "task_management" in features and features <= {"task_management", "search", "filter"}
    restaurant = features == {"restaurant_orders"} and ui.navigation == "bottom_bar"
    if (not (tasks or restaurant)
        or plan.unresolved or plan.database or plan.requested_controls or plan.suggested_controls or plan.permissions
        or plan.execution_authorized is not False):
        raise ValueError("Unsupported requirements")
    if (ui.navigation not in ("single_screen", "bottom_bar") or ui.style != "modern" or ui.motion != "system"
        or ui.adaptive_layout or ui.typography != "material_default"):
        raise ValueError("Unsupported design")
    source = "app/src/main/java/" + ui.android.application_id.replace(".", "/")
    files = ui.android.required_files + (source + "/ui/AppScreen.kt",)
    if tasks:
        files += (source + "/data/Task.kt", source + "/data/TaskStore.kt")
    files = tuple(dict.fromkeys(files))
    return replace(plan, storage=("atomic_json",), required_files=files)


