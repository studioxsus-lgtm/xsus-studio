"""Start the Future XSUS Core conversation API on a loopback address."""

import argparse
import os
import re
import sqlite3
from pathlib import Path

from aiohttp import web

from core.contracts.common import require_identifier
from core.conversation.session_conversation import SessionConversation
from core.execution.local_runtime import create_local_executor
from core.sessions.sqlite_store import SQLiteSessionStore
from languages.en.engine.english_engine import ENGLISH, create_engine
from languages.en.learning.feedback_store import SQLiteFeedbackStore
from services.api.identity.supabase import SupabaseUserAuthenticator
from services.api.learning_worker import attach_learning_worker
from core.intelligence.persistent_memory_v2 import PersistentMemory
from core.intelligence.runtime_v2 import IntelligenceRuntime
from core.intelligence.xsus_app_adapter_v2 import XSUSAppIntelligenceAdapterV2

from .app import create_app

_BIND_HOSTS = ("127.0.0.1", "::1", "0.0.0.0")


def create_local_app(
    database: Path, *, owner: str = "local-api", token: str | None = None,
    supabase_url: str | None = None, supabase_publishable_key: str | None = None,
    allowed_origins: frozenset[str] = frozenset(),
    learning_worker_enabled: bool = False, learning_poll_seconds: int = 60,
    learning_registry: Path | None = None, learning_output_dir: Path | None = None,
    intelligence_enabled: bool = False,
    intelligence_v2_enabled: bool = False,
    albanian_analysis_enabled: bool = False,
) -> web.Application:
    supabase_configured = supabase_url is not None or supabase_publishable_key is not None
    if supabase_configured:
        if not supabase_url or not supabase_publishable_key:
            raise ValueError("Both XSUS_SUPABASE_URL and XSUS_SUPABASE_PUBLISHABLE_KEY are required")
        owner_authenticator = SupabaseUserAuthenticator(supabase_url, supabase_publishable_key)
        owner_tokens = None
    else:
        require_identifier(owner, "owner_id")
        if not isinstance(token, str) or re.fullmatch(r"[A-Za-z0-9._~-]{32,256}", token) is None:
            raise ValueError("XSUS_API_TOKEN must contain 32–256 URL-safe characters")
        owner_authenticator = None
        owner_tokens = {owner: token}
    if type(intelligence_v2_enabled) is not bool:
        raise ValueError("Intelligence V2 flag must be boolean")
    intelligence_v2_adapter = None
    if intelligence_v2_enabled:
        if not database.parent.is_dir():
            raise ValueError("Persistent database directory is unavailable")
        memory_path = database.with_name(database.stem + ".intelligence-v2.sqlite3")
        intelligence_v2_adapter = XSUSAppIntelligenceAdapterV2(
            IntelligenceRuntime(PersistentMemory(str(memory_path))), enabled=True)
    executor = create_local_executor((create_engine(),))
    store = SQLiteSessionStore(database)
    feedback_store = SQLiteFeedbackStore(database.with_name(database.stem + ".feedback.sqlite3"))
    resolved_learning_registry = learning_registry or database.parent / "xsus-core-models"
    resolved_learning_output = learning_output_dir or database.parent / "xsus-core-learning"
    app = create_app(
        store=store,
        conversation=SessionConversation(executor, store),
        owner_tokens=owner_tokens,
        owner_authenticator=owner_authenticator,
        supported_languages=frozenset({ENGLISH}),
        feedback_store=feedback_store,
        allowed_origins=allowed_origins,
        learning_status_dir=resolved_learning_output,
        intelligence_enabled=intelligence_enabled,
        intelligence_v2_adapter=intelligence_v2_adapter,
        albanian_analysis_enabled=albanian_analysis_enabled,
    )
    if type(learning_worker_enabled) is not bool:
        raise ValueError("Learning-worker enabled flag must be boolean")
    if learning_worker_enabled:
        attach_learning_worker(
            app,
            feedback_store=feedback_store,
            registry_path=resolved_learning_registry,
            output_dir=resolved_learning_output,
            poll_seconds=learning_poll_seconds,
        )
    return app


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, required=True, help="SQLite database for sessions")
    parser.add_argument("--host", choices=_BIND_HOSTS, default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    if not 1 <= args.port <= 65_535:
        parser.error("--port must be between 1 and 65535")
    try:
        supabase_url = os.environ.get("XSUS_SUPABASE_URL")
        supabase_publishable_key = os.environ.get("XSUS_SUPABASE_PUBLISHABLE_KEY")
        allowed_origins = frozenset(
            origin.strip() for origin in os.environ.get("XSUS_API_ALLOWED_ORIGINS", "").split(",")
            if origin.strip()
        )
        worker_setting = os.environ.get("XSUS_LEARNING_WORKER_ENABLED", "false").strip().lower()
        if worker_setting not in {"true", "false"}:
            raise ValueError("XSUS_LEARNING_WORKER_ENABLED must be true or false")
        learning_poll_seconds = int(os.environ.get("XSUS_LEARNING_WORKER_POLL_SECONDS", "60"))
        intelligence_setting = os.environ.get("XSUS_INTELLIGENCE_ENABLED", "false").strip().lower()
        if intelligence_setting not in {"true", "false"}:
            raise ValueError("XSUS_INTELLIGENCE_ENABLED must be true or false")
        intelligence_v2_setting = os.environ.get("XSUS_INTELLIGENCE_V2_ENABLED", "false").strip().lower()
        if intelligence_v2_setting not in {"true", "false"}:
            raise ValueError("XSUS_INTELLIGENCE_V2_ENABLED must be true or false")
        sq_analysis_setting = os.environ.get("XSUS_SQ_ANALYSIS_ENABLED", "false").strip().lower()
        if sq_analysis_setting not in {"true", "false"}:
            raise ValueError("XSUS_SQ_ANALYSIS_ENABLED must be true or false")
        app = create_local_app(
            args.database,
            intelligence_enabled=intelligence_setting == "true",
            intelligence_v2_enabled=intelligence_v2_setting == "true",
            albanian_analysis_enabled=sq_analysis_setting == "true",
            owner=os.environ.get("XSUS_API_OWNER", "local-api"),
            token=os.environ.get("XSUS_API_TOKEN"),
            supabase_url=supabase_url,
            supabase_publishable_key=supabase_publishable_key,
            allowed_origins=allowed_origins,
            learning_worker_enabled=worker_setting == "true",
            learning_poll_seconds=learning_poll_seconds,
            learning_registry=Path(os.environ["XSUS_LEARNING_REGISTRY_DIR"])
            if os.environ.get("XSUS_LEARNING_REGISTRY_DIR") else None,
            learning_output_dir=Path(os.environ["XSUS_LEARNING_OUTPUT_DIR"])
            if os.environ.get("XSUS_LEARNING_OUTPUT_DIR") else None,
        )
        if os.environ.get("XSUS_ANDROID_PLANNING_ENABLED", "false") == "true":
            from services.api.android_planning import attach_android_planning
            attach_android_planning(app, os.environ.get("XSUS_ANDROID_PLANNING_TOKEN"))
        if os.environ.get("XSUS_WEB_INTERPRET_ENABLED", "false") == "true":
            from services.api.web_interpret import attach_web_interpret
            attach_web_interpret(app, os.environ.get("XSUS_WEB_INTERPRET_TOKEN"))
        if os.environ.get("XSUS_LOGO_INTERPRET_ENABLED", "false") == "true":
            from services.api.logo_endpoint import attach_logo_interpret
            attach_logo_interpret(app, os.environ.get("XSUS_LOGO_INTERPRET_TOKEN"))
        web.run_app(app, host=args.host, port=args.port, access_log=None)
    except (OSError, ValueError, sqlite3.Error) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
