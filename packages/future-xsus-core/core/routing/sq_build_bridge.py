"""Build planning handoff; never authorizes or executes a build."""
from core.routing.sq_hyper_bridge import prepare_review
from languages.sq.project_context import ProjectContext

def prepare_build_plan(context: ProjectContext, review: dict) -> dict:
    request = prepare_review(context)
    keys = ("schema_version", "project_id", "revision", "snapshot_digest")
    if not isinstance(review, dict) or set(review) != set(keys) | {"status", "findings", "execution_authorized"}:
        raise ValueError("Invalid review")
    if any(type(review[k]) is not type(request[k]) or review[k] != request[k] for k in keys):
        raise ValueError("Review binding mismatch")
    if review["status"] != "accepted" or review["execution_authorized"] is not False:
        raise ValueError("Review not eligible")
    findings = review["findings"]
    if not isinstance(findings, list) or len(findings) > 128 or any(not isinstance(f, str) or len(f) > 2048 for f in findings):
        raise ValueError("Invalid findings")
    return {**request, "operation": "application.plan",
            "destination": "future-xsus-app-build-engine",
            "review_status": "accepted", "review_findings": list(findings)}

def request_build_plan(context: ProjectContext, review: dict, transport) -> dict:
    request = prepare_build_plan(context, review)
    keys = ("schema_version", "project_id", "revision", "snapshot_digest")
    expected = {k: request[k] for k in keys}
    response = transport(request)
    if not isinstance(response, dict) or set(response) != set(keys) | {"status", "plan_id"}:
        raise ValueError("Invalid plan response")
    if any(type(response[k]) is not type(v) or response[k] != v for k, v in expected.items()):
        raise ValueError("Plan binding mismatch")
    if response["status"] not in ("planned", "unsupported", "rejected"):
        raise ValueError("Invalid plan status")
    plan_id = response["plan_id"]
    if response["status"] == "planned":
        if not isinstance(plan_id, str) or not plan_id.strip() or len(plan_id) > 128:
            raise ValueError("Invalid plan identifier")
    elif plan_id is not None:
        raise ValueError("Unexpected plan identifier")
    return {**expected, "status": response["status"], "plan_id": plan_id,
            "execution_authorized": False}
