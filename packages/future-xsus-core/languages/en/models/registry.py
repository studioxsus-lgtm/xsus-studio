"""Versioned local registry for explicitly promoted XSUS English checkpoints."""

from collections.abc import Iterator
from contextlib import closing, contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sqlite3
from tempfile import NamedTemporaryFile

from languages.en.evaluation.compare import compare_checkpoint, load_cases
from languages.en.learning.continual import promotion_decision
from languages.en.models.checkpoint import load_checkpoint

_REGISTRY_VERSION = 1
_ROOT = Path(__file__).resolve().parents[1]
_BASELINE = _ROOT / "models" / "checkpoints" / "xsus-en-written-v5.json.gz"
_EVALUATIONS = {
    "written-v4": _ROOT / "evaluation" / "quality-v4.jsonl",
    "written-v5": _ROOT / "evaluation" / "quality-v5.jsonl",
}
_DATABASE = "registry.sqlite3"


class EnglishModelRegistry:
    """Keep model artifacts immutable and switch the active revision transactionally."""

    def __init__(self, root: str | Path) -> None:
        if not str(root):
            raise ValueError("Model registry path must not be empty")
        self._root = Path(root).absolute()
        self._versions = self._root / "versions"
        self._versions.mkdir(parents=True, exist_ok=True)
        with self._connection(write=True) as connection:
            connection.execute(f"""
                CREATE TABLE IF NOT EXISTS xsus_en_model_releases_v{_REGISTRY_VERSION} (
                    revision TEXT PRIMARY KEY,
                    filename TEXT NOT NULL UNIQUE,
                    artifact_sha256 TEXT NOT NULL,
                    report_sha256 TEXT NOT NULL,
                    published_at TEXT NOT NULL
                )
            """)
            connection.execute(f"""
                CREATE TABLE IF NOT EXISTS xsus_en_model_active_v{_REGISTRY_VERSION} (
                    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
                    revision TEXT NOT NULL
                )
            """)
            connection.execute(f"""
                CREATE TABLE IF NOT EXISTS xsus_en_model_events_v{_REGISTRY_VERSION} (
                    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                    action TEXT NOT NULL CHECK (action IN ('promote', 'rollback')),
                    previous_revision TEXT,
                    active_revision TEXT NOT NULL,
                    occurred_at TEXT NOT NULL
                )
            """)

    @property
    def root(self) -> Path:
        return self._root

    def promote_candidate(
        self,
        candidate_path: str | Path,
        report_path: str | Path,
        *,
        confirm_revision: str,
    ) -> dict:
        candidate_path = Path(candidate_path)
        report_path = Path(report_path)
        candidate_bytes = candidate_path.read_bytes()
        report_bytes = report_path.read_bytes()
        artifact_sha = hashlib.sha256(candidate_bytes).hexdigest()
        revision = "sha256-" + artifact_sha
        if confirm_revision != revision:
            raise ValueError("Confirmation must exactly match the candidate revision")
        try:
            report = json.loads(report_bytes)
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ValueError("Candidate report is not valid UTF-8 JSON") from error
        if not isinstance(report, dict) or report.get("format") != "xsus-en-learning-report-v1":
            raise ValueError("Unsupported continual-learning report")
        if report.get("candidate_revision") != revision:
            raise ValueError("Candidate checkpoint does not match the report revision")
        if report.get("eligible_for_promotion") is not True or report.get("requires_human_release") is not True:
            raise ValueError("Candidate report does not authorize release review")
        before = report.get("feedback_loss_before")
        after = report.get("feedback_loss_after")
        if type(before) not in (int, float) or type(after) not in (int, float):
            raise ValueError("Candidate report has invalid feedback validation losses")
        active_baseline = self.active()
        baseline_path = Path(active_baseline["artifact"]) if active_baseline is not None else _BASELINE
        baseline_revision = load_checkpoint(baseline_path)[2]
        if report.get("baseline_revision") != baseline_revision:
            raise ValueError("Candidate was trained from a stale English baseline")
        _, _, checkpoint_revision = load_checkpoint(candidate_path)
        if checkpoint_revision != revision:
            raise ValueError("Candidate checkpoint checksum verification failed")

        cases = {name: load_cases(path) for name, path in _EVALUATIONS.items()}
        baseline_scores = {name: compare_checkpoint(baseline_path, data) for name, data in cases.items()}
        candidate_scores = {name: compare_checkpoint(candidate_path, data) for name, data in cases.items()}
        gate = promotion_decision(
            baseline_scores, candidate_scores,
            feedback_loss_before=float(before), feedback_loss_after=float(after),
        )
        if not gate["eligible_for_promotion"]:
            raise ValueError("Independent release evaluation failed: " + ", ".join(gate["reasons"]))

        filename = artifact_sha + ".json.gz"
        artifact_path = self._versions / filename
        self._store_artifact(artifact_path, candidate_bytes, artifact_sha)
        report_sha = hashlib.sha256(report_bytes).hexdigest()
        published_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with self._connection(write=True) as connection:
            table = f"xsus_en_model_releases_v{_REGISTRY_VERSION}"
            active_table = f"xsus_en_model_active_v{_REGISTRY_VERSION}"
            events_table = f"xsus_en_model_events_v{_REGISTRY_VERSION}"
            previous = self._active(connection)
            expected_previous = None if active_baseline is None else baseline_revision
            if previous != expected_previous:
                raise ValueError("Registry baseline changed during verification; rebuild the candidate")
            connection.execute(
                f"INSERT OR IGNORE INTO {table} VALUES (?, ?, ?, ?, ?)",
                (revision, filename, artifact_sha, report_sha, published_at),
            )
            stored = connection.execute(
                f"SELECT filename, artifact_sha256, report_sha256 FROM {table} WHERE revision = ?",
                (revision,),
            ).fetchone()
            if stored != (filename, artifact_sha, report_sha):
                raise ValueError("Registry revision already exists with conflicting artifact metadata")
            connection.execute(
                f"INSERT INTO {active_table} (singleton, revision) VALUES (1, ?) "
                "ON CONFLICT(singleton) DO UPDATE SET revision = excluded.revision",
                (revision,),
            )
            connection.execute(
                f"INSERT INTO {events_table} (action, previous_revision, active_revision, occurred_at) "
                "VALUES ('promote', ?, ?, ?)",
                (previous, revision, published_at),
            )
        return {"revision": revision, "previous_revision": previous, "active": True, "artifact": str(artifact_path)}

    def rollback(self, target_revision: str, *, confirm_current_revision: str) -> dict:
        occurred_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        releases = f"xsus_en_model_releases_v{_REGISTRY_VERSION}"
        active_table = f"xsus_en_model_active_v{_REGISTRY_VERSION}"
        events = f"xsus_en_model_events_v{_REGISTRY_VERSION}"
        with self._connection(write=True) as connection:
            current = self._active(connection)
            if current is None:
                raise ValueError("No English checkpoint is active in this registry")
            if current != confirm_current_revision:
                raise ValueError("Confirmation does not match the currently active revision")
            if target_revision == current:
                raise ValueError("Rollback target is already active")
            row = connection.execute(
                f"SELECT filename, artifact_sha256 FROM {releases} WHERE revision = ?", (target_revision,),
            ).fetchone()
            if row is None:
                raise KeyError("Rollback target is not a published registry revision")
            self._verified_artifact(row[0], row[1], target_revision)
            connection.execute(f"UPDATE {active_table} SET revision = ? WHERE singleton = 1", (target_revision,))
            connection.execute(
                f"INSERT INTO {events} (action, previous_revision, active_revision, occurred_at) "
                "VALUES ('rollback', ?, ?, ?)",
                (current, target_revision, occurred_at),
            )
        return {"revision": target_revision, "previous_revision": current, "active": True}

    def load_active(self):
        active = self.active()
        if active is None:
            raise LookupError("No English model has been promoted to this registry")
        tokenizer, model, loaded_revision = load_checkpoint(Path(active["artifact"]))
        if loaded_revision != active["revision"]:
            raise ValueError("Active checkpoint revision does not match registry metadata")
        return tokenizer, model, loaded_revision

    def active(self) -> dict | None:
        """Return the verified active release path and digest, if one exists."""
        with self._connection() as connection:
            revision = self._active(connection)
            if revision is None:
                return None
            table = f"xsus_en_model_releases_v{_REGISTRY_VERSION}"
            row = connection.execute(
                f"SELECT filename, artifact_sha256, published_at FROM {table} WHERE revision = ?", (revision,),
            ).fetchone()
        if row is None:
            raise ValueError("Active registry revision has no release record")
        artifact = self._verified_artifact(row[0], row[1], revision)
        return {
            "revision": revision, "artifact": str(artifact), "artifact_sha256": row[1],
            "published_at": row[2],
        }

    def releases(self) -> tuple[dict, ...]:
        with self._connection() as connection:
            table = f"xsus_en_model_releases_v{_REGISTRY_VERSION}"
            rows = connection.execute(
                f"SELECT revision, filename, artifact_sha256, report_sha256, published_at FROM {table} ORDER BY published_at, revision",
            ).fetchall()
            active = self._active(connection)
        return tuple({
            "revision": row[0], "artifact": row[1], "artifact_sha256": row[2],
            "report_sha256": row[3], "published_at": row[4], "active": row[0] == active,
        } for row in rows)

    def _verified_artifact(self, filename: str, artifact_sha: str, revision: str) -> Path:
        if filename != artifact_sha + ".json.gz" or revision != "sha256-" + artifact_sha:
            raise ValueError("Invalid registry artifact path or revision")
        path = self._versions / filename
        try:
            actual_sha = hashlib.sha256(path.read_bytes()).hexdigest()
        except OSError as error:
            raise ValueError("Registry checkpoint artifact is unavailable") from error
        if actual_sha != artifact_sha:
            raise ValueError("Registry checkpoint artifact checksum does not match")
        return path

    @staticmethod
    def _store_artifact(path: Path, data: bytes, expected_sha: str) -> None:
        if path.exists():
            if hashlib.sha256(path.read_bytes()).hexdigest() != expected_sha:
                raise ValueError("Existing registry artifact has a checksum mismatch")
            return
        with NamedTemporaryFile(dir=path.parent, delete=False) as temporary:
            temporary_path = Path(temporary.name)
            try:
                temporary.write(data)
                temporary.flush()
                os.fsync(temporary.fileno())
                temporary.close()
                if hashlib.sha256(temporary_path.read_bytes()).hexdigest() != expected_sha:
                    raise ValueError("Copied registry artifact failed checksum verification")
                os.replace(temporary_path, path)
            finally:
                temporary_path.unlink(missing_ok=True)

    @staticmethod
    def _active(connection: sqlite3.Connection) -> str | None:
        table = f"xsus_en_model_active_v{_REGISTRY_VERSION}"
        row = connection.execute(f"SELECT revision FROM {table} WHERE singleton = 1").fetchone()
        return None if row is None else row[0]

    @contextmanager
    def _connection(self, *, write: bool = False) -> Iterator[sqlite3.Connection]:
        with closing(sqlite3.connect(self._root / _DATABASE, isolation_level=None)) as connection:
            with connection:
                if write:
                    connection.execute("BEGIN IMMEDIATE")
                yield connection
