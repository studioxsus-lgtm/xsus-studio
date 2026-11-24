"""End-to-end planning orchestration with injected peer transports."""
from dataclasses import dataclass
from languages.sq.project_context import ProjectContext, update_project
from core.routing.sq_hyper_bridge import request_review
from core.routing.sq_build_bridge import request_build_plan

@dataclass(frozen=True, slots=True)
class PlanningResult:
    context: ProjectContext
    status: str
    plan_id: str | None = None
    execution_authorized: bool = False

def plan_application(context: ProjectContext, prompts: tuple[str, ...], review_transport, build_transport) -> PlanningResult:
    if not isinstance(prompts, tuple) or not 1 <= len(prompts) <= 64:
        raise ValueError("Expected 1–64 prompts")
    candidate = context
    for prompt in prompts:
        result = update_project(candidate, candidate.project_id, candidate.revision, prompt)
        if result.status not in ("updated", "unchanged"):
            return PlanningResult(context, result.status)
        candidate = result.context
    if candidate.application is None:
        return PlanningResult(context, "incomplete")
    try:
        review = request_review(candidate, review_transport)
    except (ValueError, OSError, TimeoutError):
        return PlanningResult(candidate, "review_failed")
    if review["status"] != "accepted":
        return PlanningResult(candidate, review["status"])
    try:
        plan = request_build_plan(candidate, review, build_transport)
    except (ValueError, OSError, TimeoutError):
        return PlanningResult(candidate, "planning_failed")
    return PlanningResult(candidate, plan["status"], plan["plan_id"])
