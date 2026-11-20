"""Content-addressed local staging for English candidate checkpoints.

Stage only after checking the owner-scoped registry. This is an
opt-in local archive, not a serving/release mechanism.
"""
from dataclasses import dataclass
from pathlib import Path
import os
import tempfile
import hashlib
import stat
import hmac

from .candidate_registry_v1 import SQLiteCandidateRegistryV1
from .artifact_integrity_v1 import digest_candidate_artifact_v1

_MAX_BYTES = 256 * 1024 * 1024


@dataclass(frozen=True, slots=True)
class StagedArtifactV1:
    candidate_id: str
    staged_path: str
    sha256: str
    size_bytes: int
    status: str
    release_authorized: bool = False


def _staging_target(root: Path, candidate_id: str) -> Path:
    return root / candidate_id[:2] / (candidate_id + ".checkpoint")


def stage_candidate_artifact_v1(
    registry: SQLiteCandidateRegistryV1,
    owner_id: str,
    candidate_id: str,
    source_path: str | Path,
    staging_root: str | Path,
) -> StagedArtifactV1:
    if not isinstance(registry, SQLiteCandidateRegistryV1):
        raise ValueError("SQLiteCandidateRegistryV1 required")
    record = registry.get(owner_id, candidate_id)
    if record.status != "pending_human_review":
        raise ValueError("Quarantined candidate cannot be staged for review")
    source_digest = digest_candidate_artifact_v1(source_path)
    if not hmac.compare_digest(candidate_id, source_digest.sha256):
        raise ValueError("Candidate source does not match registered SHA-256")
    root = Path(staging_root).absolute()
    root.mkdir(parents=True, exist_ok=True)
    if root.is_symlink():
        raise ValueError("Staging root must not be a symlink")
    owner_root = root / hashlib.sha256(owner_id.encode("utf-8")).hexdigest()
    owner_root.mkdir(mode=0o700, exist_ok=True)
    if owner_root.is_symlink():
        raise ValueError("Owner staging directory must not be a symlink")
    destination = _staging_target(owner_root, candidate_id)
    destination.parent.mkdir(mode=0o700, exist_ok=True)
    if destination.parent.is_symlink():
        raise ValueError("Candidate staging directory must not be a symlink")
    if destination.exists() or destination.is_symlink():
        existing = digest_candidate_artifact_v1(destination)
        if not hmac.compare_digest(existing.sha256, candidate_id):
            raise ValueError("Existing staged artifact has mismatched content")
        return StagedArtifactV1(candidate_id, str(destination), existing.sha256, existing.size_bytes, record.status)
    fd, temporary = tempfile.mkstemp(prefix=".xsus-stage-", dir=destination.parent)
    try:
        hasher = hashlib.sha256()
        total = 0
        flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
        src_fd = os.open(source_path, flags)
        try:
            original = os.fstat(src_fd)
            if not stat.S_ISREG(original.st_mode):
                raise ValueError("Source must be a regular file")
            with os.fdopen(os.dup(src_fd), "rb") as src, os.fdopen(fd, "wb") as out:
                fd = -1
                while True:
                    chunk = src.read(1024 * 1024)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > _MAX_BYTES:
                        raise ValueError("Candidate exceeds staging size limit")
                    hasher.update(chunk)
                    out.write(chunk)
                out.flush()
                os.fsync(out.fileno())
            after = os.fstat(src_fd)
            if (original.st_dev, original.st_ino, original.st_size, original.st_mtime_ns, original.st_ctime_ns) != (
                after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns
            ):
                raise ValueError("Source changed during staging")
        finally:
            os.close(src_fd)
        if total != source_digest.size_bytes or not hmac.compare_digest(hasher.hexdigest(), candidate_id):
            raise ValueError("Source changed or digest mismatched during staging")
        # Prevent replacing an existing candidate via concurrent staging.
        try:
            os.link(temporary, destination, follow_symlinks=False)
        except FileExistsError:
            existing = digest_candidate_artifact_v1(destination)
            if not hmac.compare_digest(existing.sha256, candidate_id):
                raise ValueError("Concurrent staged artifact content mismatch")
        # Recheck owner status after copying; an already staged file is
        # not automatically removed on later revocation.
        latest = registry.get(owner_id, candidate_id)
        if latest.status != "pending_human_review":
            raise ValueError("Candidate was quarantined during staging")
        final_digest = digest_candidate_artifact_v1(destination)
        if not hmac.compare_digest(final_digest.sha256, candidate_id):
            raise ValueError("Staged artifact failed final verification")
        return StagedArtifactV1(candidate_id, str(destination), final_digest.sha256, final_digest.size_bytes, latest.status)
    finally:
        if fd >= 0:
            os.close(fd)
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass


def verify_staged_candidate_v1(
    registry: SQLiteCandidateRegistryV1, owner_id: str,
    candidate_id: str, staging_root: str | Path,
) -> dict:
    record = registry.get(owner_id, candidate_id)
    owner_dir = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()
    target = _staging_target(Path(staging_root).absolute() / owner_dir, candidate_id)
    actual = digest_candidate_artifact_v1(target)
    matches = hmac.compare_digest(candidate_id, actual.sha256)
    return {
        "contract": "future-xsus-core.staged-artifact.v1",
        "integrity_verified": matches,
        "candidate_status": record.status,
        "eligible_for_human_review": matches and record.status == "pending_human_review",
        "release_authorized": False,
        "continuous_integrity_guaranteed": False,
    }
