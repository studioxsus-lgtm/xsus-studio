"""Android functional requirements, not generated implementations."""
from dataclasses import dataclass
from core.routing.sq_android_ui import AndroidUIPlan, prepare_android_ui
from languages.sq.project_context import ProjectContext

_CAPABILITIES = {
    "task_management": ("task_list","task_form","create_task","update_task","delete_task","local_storage"),
    "search": ("search_input","search_state","search_results"),
    "filtering": ("filter_controls","filter_state"),
    "sorting": ("sort_controls","sort_state"),
    "notifications": ("notification_preferences","notification_permission_check"),
    "calendar": ("calendar_screen","date_selection"),
    "profile": ("profile_screen","profile_form"),
    "authentication": ("sign_in_form","session_state","authentication_provider_required"),
    "database": ("repository_interface","database_configuration_required"),
    "payments": ("payment_provider_required","payment_review_required"),
    "report": ("report_screen","report_state"),
    "export": ("export_review_required",),
    "import": ("import_validation_required",),
}
@dataclass(frozen=True, slots=True)
class FunctionalPlan:
    ui: AndroidUIPlan
    capabilities: tuple[str, ...]
    unresolved_features: tuple[str, ...]
    required_files: tuple[str, ...]
    execution_authorized: bool = False

def prepare_functional_plan(context: ProjectContext, application_id: str, display_name: str, min_sdk: int = 26) -> FunctionalPlan:
    ui = prepare_android_ui(context, application_id, display_name, min_sdk)
    features = ui.android.features
    capabilities = tuple(dict.fromkeys(("screen_state","event_dispatch","input_validation","error_state") +
        tuple(capability for feature in features for capability in _CAPABILITIES.get(feature, ()))))
    unresolved = tuple(feature for feature in features if feature not in _CAPABILITIES)
    source = "app/src/main/java/" + application_id.replace(".", "/")
    files = ui.required_files + tuple(source + path for path in (
        "/state/AppState.kt", "/state/AppEvent.kt", "/state/AppViewModel.kt",
        "/data/AppRepository.kt", "/validation/InputValidator.kt"))
    return FunctionalPlan(ui, capabilities, unresolved, files)
