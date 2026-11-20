"""Opt-in artifact digest binding for owner-scoped candidate records.

Hashing checks bytes at verification time; it does not authenticate a
caller, provide a signed attestation, or lock a file against replacement.
"""
from dataclasses import dataclass
from pathlib import Path
import hashlib
import hmac
import os
import stat

from .candidate_registry_v1 import SQLiteCandidateRegistryV1

_MAX_ARTIFACT_BYTES = 256 * 1024 * 1024


@dataclass(frozen=True, slots=True)
class ArtifactDigestV1:
    sha256: str
    size_bytes: int


def digest_candidate_artifact_v1(path: str | Path) -> ArtifactDigestV1:
    """Hash a regular file without following a symlink, with a size limit."""
    target = Path(path)
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(target, flags)
    try:
        initial = os.fstat(fd)
        if not stat.S_ISREG(initial.st_mode):
            raise ValueError("Candidate artifact must be a regular file")
        if initial.st_size <= 0 or initial.st_size > _MAX_ARTIFACT_BYTES:
            raise ValueError("Candidate artifact size outside permitted range")
        digest = hashlib.sha256()
        total = 0
        with os.fdopen(os.dup(fd), "rb") as stream:
            while True:
                chunk = stream.read(min(1024 * 1024, _MAX_ARTIFACT_BYTES - total + 1))
                if not chunk:
                    break
                total += len(chunk)
                if total > _MAX_ARTIFACT_BYTES:
                    raise ValueError("Candidate artifact exceeds size limit")
                digest.update(chunk)
        final = os.fstat(fd)
        if (initial.st_dev, initial.st_ino, initial.st_size, initial.st_mtime_ns, initial.st_ctime_ns) != (
            final.st_dev, final.st_ino, final.st_size, final.st_mtime_ns, final.st_ctime_ns
        ):
            raise ValueError("Candidate artifact changed while hashing")
        if total != initial.st_size:
            raise ValueError("Candidate artifact size changed while hashing")
        return ArtifactDigestV1(digest.hexdigest(), total)
    finally:
        os.close(fd)


def verify_candidate_artifact_v1(
    registry: SQLiteCandidateRegistryV1,
    owner_id: str,
    candidate_id: str,
    artifact_path: str | Path,
) -> dict:
    """Require candidate ID to equal SHA-256 of the current artifact bytes."""
    if not isinstance(registry, SQLiteCandidateRegistryV1):
        raise ValueError("SQLiteCandidateRegistryV1 required")
    record = registry.get(owner_id, candidate_id)
    actual = digest_candidate_artifact_v1(artifact_path)
    matches = hmac.compare_digest(record.candidate_id, actual.sha256)
    return {
        "contract": "future-xsus-core.artifact-integrity.v1",
        "candidate_id": record.candidate_id,
        "artifact_sha256": actual.sha256,
        "artifact_size_bytes": actual.size_bytes,
        "integrity_verified": matches,
        "candidate_status": record.status,
        "eligible_for_human_review": matches and record.status == "pending_human_review",
        "release_authorized": False,
        "artifact_locked_against_changes": False,
    }
