"""Read-only cleanup planning for revoked English candidate artifacts.

This module NEVER deletes, moves, or modifies checkpoint files.
"""
from dataclasses import dataclass
from pathlib import Path
import hashlib
import os
import stat

from .candidate_registry_v1 import SQLiteCandidateRegistryV1


@dataclass(frozen=True, slots=True)
class RevokedCleanupPlanV1:
    candidate_id: str
    status: str
    action: str
    artifact_path: str | None
    reasons: tuple[str, ...]
    dry_run: bool = True
    deletion_authorized: bool = False


def plan_revoked_candidate_cleanup_v1(
    registry: SQLiteCandidateRegistryV1,
    owner_id: str,
    candidate_id: str,
    staging_root: str | Path,
) -> RevokedCleanupPlanV1:
    """Inspect only a known content-addressed location; never remove files."""
    if not isinstance(registry, SQLiteCandidateRegistryV1):
        raise ValueError("SQLiteCandidateRegistryV1 required")
    record = registry.get(owner_id, candidate_id)
    if record.status != "quarantined":
        return RevokedCleanupPlanV1(candidate_id, record.status, "no_action", None,
                                    ("candidate_not_quarantined",))
    root = Path(staging_root).absolute()
    owner_hash = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()
    owner_dir = root / owner_hash
    shard = owner_dir / candidate_id[:2]
    target = shard / (candidate_id + ".checkpoint")
    for directory in (root, owner_dir, shard):
        try:
            mode = directory.lstat().st_mode
        except FileNotFoundError:
            return RevokedCleanupPlanV1(candidate_id, record.status, "no_action", None,
                                        ("staged_artifact_missing",))
        if not stat.S_ISDIR(mode):
            return RevokedCleanupPlanV1(candidate_id, record.status, "blocked", None,
                                        ("unsafe_staging_directory",))
    try:
        target_mode = target.lstat().st_mode
    except FileNotFoundError:
        return RevokedCleanupPlanV1(candidate_id, record.status, "no_action", None,
                                    ("staged_artifact_missing",))
    if not stat.S_ISREG(target_mode):
        return RevokedCleanupPlanV1(candidate_id, record.status, "blocked", None,
                                    ("unsafe_artifact_type",))
    return RevokedCleanupPlanV1(candidate_id, record.status, "review_for_manual_cleanup",
                                str(target), ("quarantined_candidate_staged_artifact",))
