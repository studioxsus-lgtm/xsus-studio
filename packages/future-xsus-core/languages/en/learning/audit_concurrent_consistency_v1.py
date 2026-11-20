"""Optimistic two-database consistency check with change detection.

Not a distributed transaction, trusted anchor, or authentication system.
"""
from contextlib import closing
import hashlib
import json
import sqlite3

from .candidate_registry_v1 import SQLiteCandidateRegistryV1
from .review_audit_v1 import SQLiteReviewAuditV1
from .audit_hash_chain_v1 import SQLiteAuditHashChainV1, _GENESIS, _hash_event


def _snapshot(path, query, params):
    with closing(sqlite3.connect(path, timeout=10)) as db:
        db.execute("BEGIN")
        rows = db.execute(query, params).fetchall()
        db.commit()
    return rows


def _fingerprint(rows):
    return hashlib.sha256(
        json.dumps(rows, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def check_concurrent_audit_consistency_v1(
    audit: SQLiteReviewAuditV1,
    chain: SQLiteAuditHashChainV1,
    owner_id: str,
    candidate_id: str,
    *,
    max_events: int = 1000,
    expected_head: str | None = None,
    between_snapshots=None,
) -> dict:
    if not isinstance(audit, SQLiteReviewAuditV1) or not isinstance(chain, SQLiteAuditHashChainV1):
        raise ValueError("Audit and chain instances required")
    SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
    if type(max_events) is not int or not 1 <= max_events <= 1000:
        raise ValueError("max_events must be 1..1000")
    if between_snapshots is not None and not callable(between_snapshots):
        raise ValueError("between_snapshots must be callable")
    if expected_head is not None:
        import re
        if type(expected_head) is not str or re.fullmatch(r"[0-9a-f]{64}", expected_head) is None:
            raise ValueError("expected_head must be a lowercase SHA-256 hex digest")
    params = (owner_id, candidate_id)
    audit_query = (
        "SELECT sequence,status,reasons_json,checked_at FROM xsus_review_audit_v1 "
        "WHERE owner_id=? AND candidate_id=? ORDER BY sequence"
    )
    chain_query = (
        "SELECT ordinal,audit_sequence,status,previous_digest,digest "
        "FROM xsus_audit_hash_chain_v1 WHERE owner_id=? AND candidate_id=? ORDER BY ordinal"
    )
    first_audit = _snapshot(audit.path, audit_query, params)
    first_chain = _snapshot(chain.path, chain_query, params)
    if between_snapshots is not None:
        between_snapshots()
    second_audit = _snapshot(audit.path, audit_query, params)
    second_chain = _snapshot(chain.path, chain_query, params)
    reasons = []
    if first_audit != second_audit:
        reasons.append("audit_changed_during_check")
    if first_chain != second_chain:
        reasons.append("chain_changed_during_check")
    if not second_audit or not second_chain:
        reasons.append("missing_audit_or_chain")
    if len(second_audit) > max_events or len(second_chain) > max_events:
        reasons.append("history_limit_exceeded")
    if len(second_audit) != len(second_chain):
        reasons.append("audit_chain_count_mismatch")
    previous = _GENESIS
    last_sequence = 0
    for index, (ordinal, seq, status, prior, digest) in enumerate(second_chain, 1):
        if ordinal != index or type(seq) is not int or seq <= last_sequence:
            reasons.append("chain_order_invalid")
        if status not in ("blocked", "ready_for_human_review"):
            reasons.append("chain_status_invalid")
        if prior != previous or digest != _hash_event(
            owner_id, candidate_id, ordinal, seq, status, prior
        ):
            reasons.append("chain_digest_invalid")
        if index <= len(second_audit):
            a_seq, a_status, raw_reasons, checked_at = second_audit[index - 1]
            if (a_seq, a_status) != (seq, status):
                reasons.append("audit_chain_event_mismatch")
            try:
                decoded = json.loads(raw_reasons)
            except (TypeError, ValueError):
                decoded = None
            if (type(decoded) is not list or any(
                type(reason) is not str or not reason or len(reason) > 256
                for reason in decoded
            )):
                reasons.append("audit_reasons_invalid")
            elif (a_status == "blocked" and not decoded) or (
                a_status == "ready_for_human_review" and decoded
            ):
                reasons.append("audit_status_reasons_mismatch")
        previous = digest
        last_sequence = seq
    head = second_chain[-1][-1] if second_chain else None
    if expected_head is not None and head != expected_head:
        reasons.append("trusted_head_mismatch")
    reasons = list(dict.fromkeys(reasons))
    return {
        "contract": "future-xsus-core.audit-concurrent-consistency.v1",
        "candidate_id": candidate_id,
        "status": "consistent_at_check" if not reasons else "inconsistent_or_changed",
        "reasons": reasons,
        "audit_count": len(second_audit),
        "chain_count": len(second_chain),
        "head": head,
        "audit_snapshot_sha256": _fingerprint(second_audit),
        "chain_snapshot_sha256": _fingerprint(second_chain),
        "atomic_across_databases": False,
        "externally_anchored": False,
        "release_authorized": False,
    }
