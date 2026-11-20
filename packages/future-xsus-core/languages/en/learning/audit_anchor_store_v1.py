"""Local exclusive-create anchor storage, distinct from the chain SQLite file.

Filesystem separation is not an independent trust boundary.
"""
from pathlib import Path
import json
import os
import stat

from .audit_head_anchor_v1 import verify_audit_head_anchor_v1
from .audit_hash_chain_v1 import SQLiteAuditHashChainV1
from .candidate_registry_v1 import SQLiteCandidateRegistryV1


def _target(root, owner_id, candidate_id):
    SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
    import hashlib
    root = Path(root).absolute()
    return root / hashlib.sha256(owner_id.encode("utf-8")).hexdigest() / (candidate_id + ".anchor.json")


def save_audit_anchor_v1(root, owner_id, candidate_id, anchor: dict) -> Path:
    """Create once, refuse overwrite and symlink; caller must verify anchor first."""
    target = _target(root, owner_id, candidate_id)
    if not isinstance(anchor, dict):
        raise ValueError("Anchor object required")
    if anchor.get("owner_id") != owner_id or anchor.get("candidate_id") != candidate_id:
        raise ValueError("Anchor scope mismatch")
    if target.parent.is_symlink():
        raise ValueError("Symlink directory refused")
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    data = (json.dumps(anchor, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf-8")
    if len(data) > 4096:
        raise ValueError("Anchor too large")
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(target, flags, 0o600)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
    except BaseException:
        try:
            target.unlink()
        except OSError:
            pass
        raise
    # Directory sync reduces risk of losing the new filename on abrupt power loss.
    if hasattr(os, "O_DIRECTORY"):
        dirfd = os.open(target.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(dirfd)
        finally:
            os.close(dirfd)
    return target


def load_audit_anchor_v1(root, owner_id, candidate_id) -> dict:
    target = _target(root, owner_id, candidate_id)
    if target.parent.is_symlink():
        raise ValueError("Symlink directory refused")
    st = target.lstat()
    if not stat.S_ISREG(st.st_mode) or st.st_size > 4096:
        raise ValueError("Unsafe anchor file")
    flags = os.O_RDONLY
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(target, flags)
    with os.fdopen(fd, "rb") as stream:
        data = stream.read(4097)
    if len(data) > 4096:
        raise ValueError("Anchor too large")
    anchor = json.loads(data.decode("utf-8"))
    if type(anchor) is not dict:
        raise ValueError("Anchor must be object")
    return anchor


def verify_stored_audit_anchor_v1(
    chain: SQLiteAuditHashChainV1, root, owner_id, candidate_id, secret_key: bytes
) -> dict:
    anchor = load_audit_anchor_v1(root, owner_id, candidate_id)
    result = verify_audit_head_anchor_v1(chain, owner_id, candidate_id, anchor, secret_key)
    return {**result, "local_anchor_file_checked": True,
            "independent_trust_boundary": False, "release_authorized": False}
