"""Deterministic dependency-aware task planning with explicit authorization gates.

Planning and simulation are local only. No tools, shell, network, or file writes.
"""
from dataclasses import dataclass
from .knowledge_v1 import _id, _text

MAX_TASKS = 128
MAX_DEPENDENCIES = 16


@dataclass(frozen=True, slots=True)
class Task:
    task_id: str
    description: str
    depends_on: tuple[str, ...] = ()

    def __post_init__(self):
        _id(self.task_id)
        _text(self.description)
        if not isinstance(self.depends_on, tuple) or len(self.depends_on) > MAX_DEPENDENCIES:
            raise ValueError("too many dependencies")
        for dependency in self.depends_on:
            _id(dependency)
        if len(set(self.depends_on)) != len(self.depends_on):
            raise ValueError("duplicate dependency")
        if self.task_id in self.depends_on:
            raise ValueError("self dependency")


@dataclass(frozen=True, slots=True)
class TaskPlan:
    status: str
    ordered_ids: tuple[str, ...]
    tasks: tuple[Task, ...]
    limitations: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class PlanProgress:
    status: str
    completed_ids: tuple[str, ...]
    ready_ids: tuple[str, ...]
    blocked_ids: tuple[str, ...]
    verified: bool


class TaskPlanner:
    def build(self, tasks: tuple[Task, ...]) -> TaskPlan:
        if not isinstance(tasks, tuple) or not 1 <= len(tasks) <= MAX_TASKS:
            raise ValueError("plan must contain 1 to 128 tasks")
        if any(not isinstance(task, Task) for task in tasks):
            raise ValueError("invalid task")
        index = {task.task_id: task for task in tasks}
        if len(index) != len(tasks):
            raise ValueError("duplicate task IDs")
        if any(dep not in index for task in tasks for dep in task.depends_on):
            raise ValueError("unknown dependency")
        remaining = {task.task_id: set(task.depends_on) for task in tasks}
        ordered = []
        while remaining:
            ready = sorted(task_id for task_id, deps in remaining.items() if not deps)
            if not ready:
                return TaskPlan("cycle", (), tasks, ("dependency_cycle_detected",))
            for task_id in ready:
                ordered.append(task_id)
                del remaining[task_id]
            for deps in remaining.values():
                deps.difference_update(ready)
        return TaskPlan("planned", tuple(ordered), tasks,
                        ("plan_not_executed", "authorization_required"))

    def progress(self, plan: TaskPlan, completed_ids: tuple[str, ...]) -> PlanProgress:
        if not isinstance(plan, TaskPlan) or plan.status != "planned":
            raise ValueError("requires an acyclic plan")
        if not isinstance(completed_ids, tuple) or len(set(completed_ids)) != len(completed_ids):
            raise ValueError("invalid completed task IDs")
        completed = set(completed_ids)
        index = {task.task_id: task for task in plan.tasks}
        if not completed.issubset(index):
            raise ValueError("unknown completed task")
        for task_id in completed:
            if not set(index[task_id].depends_on).issubset(completed):
                raise ValueError("completed task has unmet dependencies")
        pending = set(index) - completed
        ready = tuple(task_id for task_id in plan.ordered_ids
                      if task_id in pending and set(index[task_id].depends_on).issubset(completed))
        blocked = tuple(task_id for task_id in plan.ordered_ids
                        if task_id in pending and task_id not in ready)
        return PlanProgress("complete" if not pending else "in_progress",
                            tuple(task_id for task_id in plan.ordered_ids if task_id in completed),
                            ready, blocked, True)

    def verify(self, plan: TaskPlan) -> bool:
        if not isinstance(plan, TaskPlan) or plan.status != "planned":
            return False
        try:
            rebuilt = self.build(plan.tasks)
            return rebuilt.status == "planned" and rebuilt.ordered_ids == plan.ordered_ids
        except ValueError:
            return False
