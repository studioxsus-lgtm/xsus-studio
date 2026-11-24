"""Static preview response contract; never executes returned source."""
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class PreviewFile:
    path: str
    content: str

@dataclass(frozen=True, slots=True)
class StaticPreview:
    files: tuple[PreviewFile, ...]
    kind: str = "static-preview"
    requires_review: bool = True
    execution_authorized: bool = False

def prepare_preview_request(goal: str) -> dict:
    if not isinstance(goal, str) or not goal.strip() or len(goal.strip()) > 2000:
        raise ValueError("Invalid goal")
    goal = goal.strip()
    # Existing worker receives only the first 100 characters.
    if len(goal) > 100:
        raise ValueError("Goal exceeds worker capacity")
    return {"goal": goal}

def validate_preview_response(response: dict) -> StaticPreview:
    if not isinstance(response, dict) or set(response) != {"kind", "requiresReview", "files"}:
        raise ValueError("Invalid preview envelope")
    if response["kind"] != "static-preview" or response["requiresReview"] is not True:
        raise ValueError("Invalid preview status")
    files = response["files"]
    if not isinstance(files, list) or len(files) != 3:
        raise ValueError("Invalid manifest")
    found = {}
    for item in files:
        if not isinstance(item, dict) or set(item) != {"path", "content"}:
            raise ValueError("Invalid file")
        path, content = item["path"], item["content"]
        if not isinstance(path, str) or path not in ("index.html", "styles.css", "main.js") or path in found:
            raise ValueError("Invalid file path")
        if not isinstance(content, str) or not content.strip() or len(content.encode("utf-8")) > 250000:
            raise ValueError("Invalid file content")
        found[path] = PreviewFile(path, content)
    return StaticPreview(tuple(found[p] for p in ("index.html", "styles.css", "main.js")))
