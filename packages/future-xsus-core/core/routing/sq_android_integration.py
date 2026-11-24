"""Unified Android planning entry point. No remote calls or build authorization."""
from dataclasses import dataclass
from languages.sq.project_context import ProjectContext, update_project
from core.routing.sq_android_persistence_security import PersistenceSecurityPlan, prepare_persistence_security
from core.routing.sq_android_apk_contract import prepare_apk_request

@dataclass(frozen=True, slots=True)
class AndroidPlanningOutcome:
    context: ProjectContext
    status: str
    plan: PersistenceSecurityPlan | None = None
    build_request: dict | None = None
    execution_authorized: bool = False

def plan_android_application(context: ProjectContext, prompts: tuple[str, ...], application_id: str, display_name: str, min_sdk: int = 26) -> AndroidPlanningOutcome:
    if not isinstance(context, ProjectContext):
        raise TypeError("Expected ProjectContext")
    if not isinstance(prompts, tuple) or not 1 <= len(prompts) <= 64:
        raise ValueError("Expected 1–64 prompts")
    candidate = context
    for prompt in prompts:
        if not isinstance(prompt, str):
            return AndroidPlanningOutcome(context, "invalid_prompt")
        result = update_project(candidate, candidate.project_id, candidate.revision, prompt)
        if result.status not in ("updated", "unchanged"):
            return AndroidPlanningOutcome(context, result.status)
        candidate = result.context
    if candidate.application is None:
        return AndroidPlanningOutcome(candidate, "incomplete")
    if candidate.application.platform != "android":
        return AndroidPlanningOutcome(candidate, "unsupported_platform")
    try:
        plan = prepare_persistence_security(candidate, application_id, display_name, min_sdk)
    except ValueError:
        return AndroidPlanningOutcome(context, "invalid_specification")
    if plan.unresolved:
        return AndroidPlanningOutcome(candidate, "review_required", plan)
    return AndroidPlanningOutcome(candidate, "draft_ready", plan, prepare_apk_request(plan))
