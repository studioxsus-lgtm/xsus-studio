"""Verify an archived signed checkpoint against a historical chain prefix.

This checks a supplied trusted checkpoint, not archive completeness.
"""
from contextlib import closing
import hashlib
import hmac
import sqlite3

from .audit_head_anchor_v1 import _key, _payload, _serialize, _CONTRACT
from .audit_hash_chain_v1 import SQLiteAuditHashChainV1, _GENESIS, _hash_event
from .audit_anchor_store_v1 import load_audit_anchor_v1
from .candidate_registry_v1 import SQLiteCandidateRegistryV1


def verify_audit_anchor_prefix_v1(chain, owner_id, candidate_id, anchor, secret_key):
    _key(secret_key)
    if not isinstance(chain, SQLiteAuditHashChainV1):
        raise ValueError("Chain instance required")
    SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
    if type(anchor) is not dict or set(anchor) != {
        "contract", "owner_id", "candidate_id", "event_count", "head",
        "signature", "release_authorized"
    }:
        raise ValueError("Invalid anchor schema")
    import re
    hex64 = re.compile(r"[a-f0-9]{64}\Z")
    count, head, signature = anchor["event_count"], anchor["head"], anchor["signature"]
    if (anchor["contract"] != _CONTRACT or type(count) is not int or count < 1
            or type(head) is not str or not hex64.fullmatch(head)
            or type(signature) is not str or not hex64.fullmatch(signature)
            or anchor["release_authorized"] is not False
            or type(anchor["owner_id"]) is not str or type(anchor["candidate_id"]) is not str):
        raise ValueError("Invalid anchor fields")
    reasons = []
    if anchor["owner_id"] != owner_id or anchor["candidate_id"] != candidate_id:
        reasons.append("anchor_scope_mismatch")
    signed = hmac.new(secret_key, _serialize(_payload(
        anchor["owner_id"], anchor["candidate_id"], count, head
    )), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signed, signature):
        reasons.append("anchor_signature_invalid")
    with closing(sqlite3.connect(chain.path, timeout=10)) as db:
        db.execute("BEGIN")
        rows = db.execute(
            "SELECT ordinal,audit_sequence,status,previous_digest,digest "
            "FROM xsus_audit_hash_chain_v1 WHERE owner_id=? AND candidate_id=? ORDER BY ordinal",
            (owner_id, candidate_id),
        ).fetchall()
        db.commit()
    if len(rows) < count:
        reasons.append("anchored_prefix_truncated")
    previous = _GENESIS
    last_sequence = 0
    for index, (ordinal, sequence, status, prior, digest) in enumerate(rows, 1):
        if ordinal != index or type(sequence) is not int or sequence <= last_sequence:
            reasons.append("chain_order_invalid")
        if status not in ("blocked", "ready_for_human_review"):
            reasons.append("chain_status_invalid")
        if prior != previous or digest != _hash_event(
            owner_id, candidate_id, ordinal, sequence, status, prior
        ):
            reasons.append("chain_digest_invalid")
        if index == count and digest != head:
            reasons.append("anchored_prefix_head_mismatch")
        previous, last_sequence = digest, sequence
    reasons = list(dict.fromkeys(reasons))
    return {
        "contract": "future-xsus-core.audit-anchor-prefix.v1",
        "candidate_id": candidate_id,
        "status": "consistent_at_check" if not reasons else "inconsistent_or_untrusted",
        "reasons": reasons,
        "anchored_event_count": count,
        "current_event_count": len(rows),
        "historical_prefix_verified_at_check": not reasons,
        "externally_stored_anchor_verified": False,
        "release_authorized": False,
    }


def verify_archived_audit_anchor_prefix_v1(
    chain, root, version, owner_id, candidate_id, secret_key
):
    # The archive version validator is shared with the archive module.
    from .audit_anchor_archive_v1 import _version_root
    anchor = load_audit_anchor_v1(_version_root(root, version), owner_id, candidate_id)
    result = verify_audit_anchor_prefix_v1(chain, owner_id, candidate_id, anchor, secret_key)
    return {**result, "archive_version": version, "local_archive": True}
