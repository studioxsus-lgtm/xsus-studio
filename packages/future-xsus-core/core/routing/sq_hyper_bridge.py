"""Transport-neutral review handoff. Digest binds a snapshot, not peer identity."""
from dataclasses import asdict
import hashlib
import json
from typing import Callable
from languages.sq.project_context import ProjectContext

def prepare_review(context: ProjectContext) -> dict:
    if not isinstance(context, ProjectContext):
        raise TypeError("Expected ProjectContext")
    if not context.project_id.strip() or context.revision < 0 or context.application is None:
        raise ValueError("Incomplete project")
    snapshot = json.loads(json.dumps(asdict(context), ensure_ascii=False))
    encoded = json.dumps(snapshot, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return {"schema_version": "1.0", "operation": "project.review",
            "source": "future-xsus-core", "destination": "hyper-xsus-core",
            "project_id": context.project_id, "revision": context.revision,
            "snapshot_digest": hashlib.sha256(encoded).hexdigest(),
            "specification": snapshot, "execution_authorized": False}

def request_review(context: ProjectContext, transport: Callable[[dict], dict]) -> dict:
    request = prepare_review(context)
    expected = {key: request[key] for key in ("schema_version", "project_id", "revision", "snapshot_digest")}
    response = transport(request)
    if not isinstance(response, dict) or set(response) != set(expected) | {"status", "findings"}:
        raise ValueError("Invalid review response")
    if any(type(response[key]) is not type(value) or response[key] != value for key, value in expected.items()):
        raise ValueError("Review binding mismatch")
    if response["status"] not in ("accepted", "needs_changes", "rejected"):
        raise ValueError("Invalid review status")
    findings = response["findings"]
    if not isinstance(findings, list) or len(findings) > 128 or any(not isinstance(item, str) or len(item) > 2048 for item in findings):
        raise ValueError("Invalid findings")
    return {**expected, "status": response["status"], "findings": list(findings),
            "execution_authorized": False}
