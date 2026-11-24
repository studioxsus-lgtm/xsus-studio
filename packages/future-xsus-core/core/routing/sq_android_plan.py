"""Native Android planning contract, not a compiler or build authorization."""
import re
from dataclasses import dataclass
from languages.sq.project_context import ProjectContext
from core.routing.sq_hyper_bridge import prepare_review

@dataclass(frozen=True, slots=True)
class AndroidPlan:
    project_id: str
    revision: int
    snapshot_digest: str
    application_id: str
    display_name: str
    min_sdk: int
    features: tuple[str, ...]
    required_files: tuple[str, ...]
    execution_authorized: bool = False

def prepare_android_plan(context: ProjectContext, application_id: str, display_name: str, min_sdk: int = 26) -> AndroidPlan:
    if not isinstance(context, ProjectContext) or context.application is None or context.application.platform != "android":
        raise ValueError("Android specification required")
    if not isinstance(application_id, str) or len(application_id) > 150 or not re.fullmatch(r"[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+", application_id):
        raise ValueError("Invalid application ID")
    if not isinstance(display_name, str) or not 1 <= len(display_name.strip()) <= 80 or any(ord(c) < 32 for c in display_name):
        raise ValueError("Invalid display name")
    if type(min_sdk) is not int or not 23 <= min_sdk <= 35:
        raise ValueError("Unsupported minimum SDK")
    snapshot = prepare_review(context)
    source = "app/src/main/java/" + application_id.replace(".", "/")
    files = ("settings.gradle.kts", "build.gradle.kts", "gradle.properties",
             "app/build.gradle.kts", "app/src/main/AndroidManifest.xml",
             source + "/MainActivity.kt", source + "/ui/AppTheme.kt",
             "app/src/main/res/values/strings.xml")
    return AndroidPlan(context.project_id, context.revision, snapshot["snapshot_digest"],
                       application_id, display_name.strip(), min_sdk,
                       context.application.features, files)
