"""Read-only continuity check of local versioned signed checkpoints."""
from .audit_anchor_archive_v1 import list_audit_anchor_versions_v1, _version_root
from .audit_anchor_store_v1 import load_audit_anchor_v1
from .audit_anchor_prefix_v1 import verify_audit_anchor_prefix_v1
from .audit_hash_chain_v1 import SQLiteAuditHashChainV1
from .candidate_registry_v1 import SQLiteCandidateRegistryV1


def inspect_audit_anchor_continuity_v1(
    chain, root, owner_id, candidate_id, secret_key, *,
    max_versions=100, require_consecutive_versions=True,
):
    if not isinstance(chain, SQLiteAuditHashChainV1):
        raise ValueError("Chain instance required")
    SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
    if type(max_versions) is not int or not 1 <= max_versions <= 1000:
        raise ValueError("max_versions must be 1..1000")
    if type(require_consecutive_versions) is not bool:
        raise ValueError("require_consecutive_versions must be boolean")
    # Validates secret even when archive is empty.
    from .audit_head_anchor_v1 import _key
    _key(secret_key)
    versions = list_audit_anchor_versions_v1(root, owner_id, candidate_id)
    reasons = []
    if not versions:
        reasons.append("no_checkpoints")
    if len(versions) > max_versions:
        reasons.append("version_limit_exceeded")
    if require_consecutive_versions:
        expected = tuple("v" + str(i) for i in range(1, len(versions) + 1))
        if versions != expected:
            reasons.append("version_gap_or_noncanonical_sequence")
    previous_count = 0
    previous_head = None
    checks = []
    for version in versions[:max_versions]:
        anchor = load_audit_anchor_v1(_version_root(root, version), owner_id, candidate_id)
        result = verify_audit_anchor_prefix_v1(chain, owner_id, candidate_id, anchor, secret_key)
        checks.append({
            "version": version, "status": result["status"],
            "anchored_event_count": result["anchored_event_count"],
            "reasons": result["reasons"],
        })
        if result["status"] != "consistent_at_check":
            reasons.append("checkpoint_verification_failed:" + version)
        count = result["anchored_event_count"]
        if count <= previous_count:
            reasons.append("non_increasing_checkpoint_count:" + version)
        if previous_head == anchor["head"]:
            reasons.append("repeated_checkpoint_head:" + version)
        previous_count, previous_head = count, anchor["head"]
    reasons = list(dict.fromkeys(reasons))
    return {
        "contract": "future-xsus-core.audit-anchor-continuity.v1",
        "candidate_id": candidate_id,
        "status": "consistent_at_check" if not reasons else "inconsistent_or_incomplete",
        "reasons": reasons,
        "version_count": len(versions),
        "versions": versions,
        "checks": checks,
        "local_archive": True,
        "archive_completeness_proven": False,
        "independent_trust_boundary": False,
        "release_authorized": False,
    }
