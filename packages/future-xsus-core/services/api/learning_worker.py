"""Optional in-process scheduler for owner-scoped learning candidates."""

import asyncio
import logging
import sqlite3
from pathlib import Path

from aiohttp import web

from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.learning.worker import run_all_owners_once
from languages.en.models.registry import EnglishModelRegistry

_LOGGER = logging.getLogger(__name__)
_TASK_KEY = web.AppKey("xsus_learning_worker_task", asyncio.Task)


def attach_learning_worker(
    app: web.Application, *, feedback_store: SQLiteFeedbackStore, registry_path: Path,
    output_dir: Path, poll_seconds: int = 60, max_cycles_per_poll: int = 1,
) -> None:
    """Schedule bounded candidate cycles and stop the scheduler with the API."""
    if type(poll_seconds) is not int or not 10 <= poll_seconds <= 3600:
        raise ValueError("Learning-worker poll interval must be between 10 and 3600 seconds")
    if type(max_cycles_per_poll) is not int or not 1 <= max_cycles_per_poll <= 100:
        raise ValueError("Learning-worker cycles per poll must be between 1 and 100")
    registry = EnglishModelRegistry(registry_path)

    async def run_loop() -> None:
        while True:
            try:
                result = await asyncio.to_thread(
                    run_all_owners_once,
                    store=feedback_store,
                    registry=registry,
                    output_dir=output_dir,
                    max_cycles_per_poll=max_cycles_per_poll,
                )
                _LOGGER.info(
                    "Learning worker cycle completed: status=%s processed_owners=%s",
                    result.get("status"), result.get("processed_owners", 0),
                )
            except (OSError, RuntimeError, ValueError, sqlite3.Error) as error:
                _LOGGER.error("Learning worker cycle failed: %s", type(error).__name__)
            await asyncio.sleep(poll_seconds)

    async def start(_: web.Application) -> None:
        app[_TASK_KEY] = asyncio.create_task(run_loop(), name="xsus-learning-worker")

    async def stop(_: web.Application) -> None:
        task = app.get(_TASK_KEY)
        if task is not None:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    app.on_startup.append(start)
    app.on_cleanup.append(stop)
