"""Coordinate existing draft and preview contracts through trusted injected clients.

The draft is not authorization. The caller must supply an authenticated,
server-side approval check bound to the exact project and draft.
"""
from dataclasses import dataclass
from languages.sq.project_context import ProjectContext
from core.routing.sq_legacy_draft_adapter import prepare_legacy_draft
from core.routing.sq_static_preview_adapter import (
    StaticPreview, prepare_preview_request, validate_preview_response,
)

@dataclass(frozen=True, slots=True)
class PreviewOutcome:
    status: str
    preview: StaticPreview | None = None
    execution_authorized: bool = False

def coordinate_preview(context: ProjectContext, draft_client, approval_check, preview_client) -> PreviewOutcome:
    if not isinstance(context, ProjectContext) or context.application is None:
        return PreviewOutcome("incomplete")
    if context.application.platform != "web":
        return PreviewOutcome("unsupported_platform")
    try:
        request = prepare_legacy_draft(context)
        # The worker only accepts a short goal. Do not silently drop features.
        if context.application.features:
            return PreviewOutcome("unsupported_features")
        preview_request = prepare_preview_request(request["goal"])
        draft = draft_client(request)
        if not isinstance(draft, dict):
            return PreviewOutcome("invalid_draft")
        safety = draft.get("safety")
        if not isinstance(safety, dict) or safety.get("executable") is not False or safety.get("sideEffects") is not False:
            return PreviewOutcome("invalid_draft")
        if draft.get("status") == "review_required":
            return PreviewOutcome("review_required")
        plan = draft.get("plan")
        if draft.get("status") != "completed" or not isinstance(plan, dict):
            return PreviewOutcome("invalid_draft")
        steps = plan.get("steps")
        if not isinstance(steps, list) or not 1 <= len(steps) <= 100:
            return PreviewOutcome("invalid_draft")
        if approval_check(context, request, draft, preview_request) is not True:
            return PreviewOutcome("approval_required")
        preview = validate_preview_response(preview_client(preview_request))
        return PreviewOutcome("preview_ready", preview)
    except (ValueError, OSError):
        return PreviewOutcome("integration_failed")
