"""Adapter for the existing Hyper–Future draft goal/steps contract.

Only supported requirements are translated. No network access or authorization.
"""
from languages.sq.project_context import ProjectContext

_FEATURES = {"notifications": "notifications", "payments": "payments",
             "task_management": "task management", "search": "search",
             "authentication": "authentication", "calendar": "calendar",
             "profile": "user profile", "database": "database"}

def prepare_legacy_draft(context: ProjectContext) -> dict:
    if not isinstance(context, ProjectContext) or context.application is None:
        raise ValueError("Application specification required")
    app = context.application
    if app.platform not in (None, "android", "ios", "web"):
        raise ValueError("Unsupported platform")
    if any(feature not in _FEATURES for feature in app.features):
        raise ValueError("Unsupported feature")
    # The existing endpoint accepts goal and steps, not structured specifications.
    # Reject details that cannot yet be represented without semantic loss.
    if context.design is not None or context.database or context.security is not None:
        raise ValueError("Structured requirements need a versioned endpoint")
    goal = "Build an " + app.platform + " application" if app.platform in ("android", "ios") else "Build a web application" if app.platform == "web" else "Build an application"
    tasks = ["Define the application structure"]
    tasks.extend("Plan " + _FEATURES[feature] for feature in app.features)
    return {"goal": goal, "steps": [{"id": f"step-{i}", "task": task, "dependsOn": []}
                                    for i, task in enumerate(tasks, 1)]}
