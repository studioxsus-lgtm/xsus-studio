"""Versioned, exclusive-create local audit head checkpoints.

The archive is a local convenience, not an external trust anchor.
"""
from pathlib import Path
import re

from .audit_anchor_store_v1 import save_audit_anchor_v1, load_audit_anchor_v1
from .audit_head_anchor_v1 import verify_audit_head_anchor_v1
from .audit_hash_chain_v1 import SQLiteAuditHashChainV1
from .candidate_registry_v1 import SQLiteCandidateRegistryV1

_VERSION = re.compile(r"v[1-9][0-9]{0,8}\Z")


def _version_root(root, version):
    if type(version) is not str or not _VERSION.fullmatch(version):
        raise ValueError("Version must match v[1-9][0-9]{0,8}")
    return Path(root).absolute() / "checkpoints" / version


def archive_audit_anchor_v1(root, version, owner_id, candidate_id, anchor, *, chain, secret_key):
    """Verify before writing, never overwrite an existing checkpoint."""
    SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
    if not isinstance(chain, SQLiteAuditHashChainV1):
        raise ValueError("Chain instance required")
    target_root = _version_root(root, version)
    verified = verify_audit_head_anchor_v1(chain, owner_id, candidate_id, anchor, secret_key)
    if verified["status"] != "consistent_at_check":
        raise ValueError("Untrusted or stale checkpoint refused")
    return save_audit_anchor_v1(target_root, owner_id, candidate_id, anchor)


def verify_archived_audit_anchor_v1(root, version, owner_id, candidate_id, *, chain, secret_key):
    SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
    target_root = _version_root(root, version)
    anchor = load_audit_anchor_v1(target_root, owner_id, candidate_id)
    verified = verify_audit_head_anchor_v1(chain, owner_id, candidate_id, anchor, secret_key)
    return {
        **verified, "archive_version": version, "local_archive": True,
        "independent_trust_boundary": False, "release_authorized": False,
    }


def list_audit_anchor_versions_v1(root, owner_id, candidate_id):
    """List present version labels, not a proof of archive completeness."""
    SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
    versions_root = Path(root).absolute() / "checkpoints"
    if not versions_root.exists():
        return ()
    if versions_root.is_symlink() or not versions_root.is_dir():
        raise ValueError("Unsafe version archive directory")
    versions = []
    for entry in versions_root.iterdir():
        if not _VERSION.fullmatch(entry.name):
            continue
        if entry.is_symlink() or not entry.is_dir():
            raise ValueError("Unsafe checkpoint version directory")
        try:
            load_audit_anchor_v1(entry, owner_id, candidate_id)
        except FileNotFoundError:
            continue
        versions.append(entry.name)
    return tuple(sorted(versions, key=lambda label: int(label[1:])))
