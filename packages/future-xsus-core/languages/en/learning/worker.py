"""Run a bounded local worker that turns reviewed feedback into model candidates."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import time
from tempfile import NamedTemporaryFile

from languages.en.learning.continual import (
    build_candidate,
    feedback_set_revision,
    training_source_fingerprints,
)
from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.models.checkpoint import load_checkpoint
from languages.en.models.registry import EnglishModelRegistry

_EN_ROOT = Path(__file__).resolve().parents[1]
_REPOSITORY_ROOT = _EN_ROOT.parents[1]
_DEFAULT_BASELINE = _EN_ROOT / "models" / "checkpoints" / "xsus-en-written-v5.json.gz"
_DEFAULT_TRAINING = _EN_ROOT / "data" / "training-v5.jsonl"
_DEFAULT_EVALUATIONS = {
    "written-v4": _EN_ROOT / "evaluation" / "quality-v4.jsonl",
    "written-v5": _EN_ROOT / "evaluation" / "quality-v5.jsonl",
}
_MINIMUM_EXAMPLES = 5


def _require_external_path(path: Path, label: str) -> Path:
    resolved = path.expanduser().absolute().resolve()
    if resolved == _REPOSITORY_ROOT or _REPOSITORY_ROOT in resolved.parents:
        raise ValueError(f"{label} must be stored outside the repository")
    return resolved


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False).encode("utf-8")
    with NamedTemporaryFile(dir=path.parent, delete=False) as temporary:
        temporary_path = Path(temporary.name)
        try:
            temporary.write(data)
            temporary.flush()
            os.fsync(temporary.fileno())
            temporary.close()
            os.replace(temporary_path, path)
        finally:
            temporary_path.unlink(missing_ok=True)


def _candidate_key(
    feedback_revision: str,
    baseline_revision: str,
    owner_scope: str,
    sources: dict[str, str],
    training_path: Path,
    evaluation_paths: dict[str, Path],
    cycle_parameters: dict,
) -> str:
    identity = {
        "feedback_revision": feedback_revision,
        "baseline_revision": baseline_revision,
        "owner_scope": owner_scope,
        "training_sources": sources,
        "training_corpus": hashlib.sha256(training_path.read_bytes()).hexdigest(),
        "evaluation_corpora": {
            name: hashlib.sha256(path.read_bytes()).hexdigest()
            for name, path in sorted(evaluation_paths.items())
        },
        "cycle_parameters": cycle_parameters,
    }
    canonical = json.dumps(identity, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _existing_candidate(candidate_path: Path, report_path: Path, *, feedback_revision: str,
                        baseline_revision: str, source_fingerprints: dict[str, str],
                        cycle_parameters: dict, registry_path: Path, owner_scope: str) -> dict | None:
    if not candidate_path.is_file() or not report_path.is_file():
        return None
    try:
        report = json.loads(report_path.read_text(encoding="utf-8"))
        candidate_revision = load_checkpoint(candidate_path)[2]
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError):
        return None
    if (
        not isinstance(report, dict)
        or report.get("format") != "xsus-en-learning-report-v1"
        or report.get("input_sha256", {}).get("approved_feedback_set") != feedback_revision
        or report.get("baseline_revision") != baseline_revision
        or report.get("training_source_sha256") != source_fingerprints
        or any(report.get(key) != value for key, value in cycle_parameters.items())
        or report.get("candidate_revision") != candidate_revision
        or report.get("requires_human_release") is not True
    ):
        return None
    return {
        "status": "candidate_ready" if report.get("eligible_for_promotion") is True else "candidate_blocked",
        "candidate_revision": candidate_revision,
        "candidate": str(candidate_path),
        "report": str(report_path),
        "eligible_for_promotion": report.get("eligible_for_promotion") is True,
        "reasons": report.get("reasons", []),
        "feedback_set_revision": feedback_revision,
        "baseline_revision": baseline_revision,
        "registry": str(registry_path),
        "owner_scope": owner_scope,
    }


def run_once(
    *, store: SQLiteFeedbackStore, owner_id: str, registry: EnglishModelRegistry,
    output_dir: Path, training_path: Path = _DEFAULT_TRAINING,
    evaluation_paths: dict[str, Path] | None = None, epochs: int = 1,
    learning_rate: float = 0.008, replay_examples: int = 96, seed: int = 23,
) -> dict:
    """Create at most one candidate for the current reviewed dataset revision."""
    output_dir = _require_external_path(output_dir, "Candidate output directory")
    _require_external_path(store.path, "Feedback database")
    registry_root = _require_external_path(registry.root, "Model registry")
    owner_scope = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()
    owner_registry = EnglishModelRegistry(registry_root / "owners" / owner_scope)
    if not output_dir.is_dir():
        output_dir.mkdir(parents=True, exist_ok=True)
    records = store.accepted(owner_id)
    if len(records) < _MINIMUM_EXAMPLES:
        return {
            "status": "waiting_for_feedback",
            "approved_examples": len(records),
            "minimum_approved_examples": _MINIMUM_EXAMPLES,
            "owner_scope": owner_scope,
        }

    active = owner_registry.active()
    baseline_path = Path(active["artifact"]) if active is not None else _DEFAULT_BASELINE
    baseline_revision = load_checkpoint(baseline_path)[2]
    feedback_revision = feedback_set_revision(records)
    source_fingerprints = training_source_fingerprints()
    selected_evaluations = evaluation_paths or _DEFAULT_EVALUATIONS
    cycle_parameters = {
        "seed": seed,
        "epochs": epochs,
        "learning_rate": learning_rate,
        "replay_limit": replay_examples,
    }
    key = _candidate_key(
        feedback_revision, baseline_revision, owner_scope, source_fingerprints,
        training_path, selected_evaluations, cycle_parameters,
    )
    candidate_path = output_dir / f"candidate-{key}.json.gz"
    report_path = output_dir / f"report-{key}.json"
    existing = _existing_candidate(
        candidate_path, report_path,
        feedback_revision=feedback_revision,
        baseline_revision=baseline_revision,
        source_fingerprints=source_fingerprints,
        cycle_parameters=cycle_parameters,
        registry_path=owner_registry.root,
        owner_scope=owner_scope,
    )
    if existing is not None:
        return existing

    blocked_path = output_dir / f"blocked-{key}.json"
    if blocked_path.is_file():
        try:
            blocked = json.loads(blocked_path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError):
            blocked = None
        if isinstance(blocked, dict) and blocked.get("key") == key:
            return {
                "status": "blocked",
                "reason": blocked.get("reason", "Learning preconditions failed"),
                "feedback_set_revision": feedback_revision,
                "baseline_revision": baseline_revision,
                "registry": str(owner_registry.root),
                "owner_scope": owner_scope,
            }

    try:
        report = build_candidate(
            store,
            owner_id,
            baseline_path=baseline_path,
            training_path=training_path,
            evaluation_paths=selected_evaluations,
            candidate_path=candidate_path,
            report_path=report_path,
            seed=seed,
            epochs=epochs,
            learning_rate=learning_rate,
            replay_examples=replay_examples,
        )
    except ValueError as error:
        reason = f"{type(error).__name__}: {error}"
        _write_json(blocked_path, {"key": key, "reason": reason})
        return {
            "status": "blocked",
            "reason": reason,
            "feedback_set_revision": feedback_revision,
            "baseline_revision": baseline_revision,
            "owner_scope": owner_scope,
        }
    verified = _existing_candidate(
        candidate_path, report_path,
        feedback_revision=feedback_revision,
        baseline_revision=baseline_revision,
        source_fingerprints=source_fingerprints,
        cycle_parameters=cycle_parameters,
        registry_path=owner_registry.root,
        owner_scope=owner_scope,
    )
    if verified is None:
        raise RuntimeError("Learning worker could not verify its candidate and report")
    return verified


def run_supervised_cycle(*, store: SQLiteFeedbackStore, owner_id: str,
                         registry: EnglishModelRegistry, output_dir: Path,
                         epochs: int = 1, learning_rate: float = 0.008,
                         replay_examples: int = 96, seed: int = 23) -> dict:
    """Run one resilient cycle and persist a privacy-safe owner status snapshot."""
    output_dir = _require_external_path(output_dir, "Candidate output directory")
    output_dir.mkdir(parents=True, exist_ok=True)
    owner_scope = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()
    status_path = output_dir / f"status-{owner_scope}.json"

    def persist(result: dict) -> dict:
        snapshot = {
            "format": "xsus-en-learning-worker-status-v1",
            "owner_scope": owner_scope,
            "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            **result,
        }
        _write_json(status_path, snapshot)
        return {**result, "status_file": str(status_path)}

    try:
        approved_count = len(store.accepted(owner_id))
        if approved_count >= _MINIMUM_EXAMPLES:
            persist({"status": "training", "approved_examples": approved_count})
        result = run_once(
            store=store,
            owner_id=owner_id,
            registry=registry,
            output_dir=output_dir,
            epochs=epochs,
            learning_rate=learning_rate,
            replay_examples=replay_examples,
            seed=seed,
        )
    except (OSError, RuntimeError, ValueError, sqlite3.Error) as error:
        result = {
            "status": "failed",
            "error_type": type(error).__name__,
            "reason": str(error),
        }
    return persist(result)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--store", type=Path, required=True, help="Local SQLite feedback store")
    parser.add_argument("--owner-id", required=True, help="Owner scope for reviewed examples")
    parser.add_argument("--registry", type=Path, required=True, help="External local model registry")
    parser.add_argument("--output-dir", type=Path, required=True, help="External candidate/report directory")
    parser.add_argument("--poll-seconds", type=int, default=60, help="Wait between checks (10–3600 seconds)")
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--learning-rate", type=float, default=0.008)
    parser.add_argument("--replay-examples", type=int, default=96)
    parser.add_argument("--seed", type=int, default=23)
    parser.add_argument("--once", action="store_true", help="Run one check and exit")
    args = parser.parse_args()
    if type(args.poll_seconds) is not int or not 10 <= args.poll_seconds <= 3600:
        parser.error("--poll-seconds must be between 10 and 3600")
    store_path = _require_external_path(args.store, "Feedback database")
    registry_path = _require_external_path(args.registry, "Model registry")
    output_dir = _require_external_path(args.output_dir, "Candidate output directory")
    store = SQLiteFeedbackStore(store_path)
    registry = EnglishModelRegistry(registry_path)
    while True:
        result = run_supervised_cycle(
            store=store, owner_id=args.owner_id, registry=registry,
            output_dir=output_dir, epochs=args.epochs,
            learning_rate=args.learning_rate, replay_examples=args.replay_examples, seed=args.seed,
        )
        print(json.dumps(result, ensure_ascii=False, sort_keys=True), flush=True)
        if args.once:
            return 0
        try:
            time.sleep(args.poll_seconds)
        except KeyboardInterrupt:
            return 0


if __name__ == "__main__":
    raise SystemExit(main())
