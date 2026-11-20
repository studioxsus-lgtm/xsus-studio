"""Opt-in bridge from persisted review events to SHA-256 chain receipts.

Not atomic across the two databases. Reconciliation is required.
"""
from .candidate_registry_v1 import SQLiteCandidateRegistryV1
from .review_audit_v1 import SQLiteReviewAuditV1
from .audit_hash_chain_v1 import SQLiteAuditHashChainV1


def append_review_audit_receipt_v1(
    audit: SQLiteReviewAuditV1, chain: SQLiteAuditHashChainV1,
    owner_id: str, candidate_id: str, audit_sequence: int,
) -> dict:
    if not isinstance(audit, SQLiteReviewAuditV1) or not isinstance(chain, SQLiteAuditHashChainV1):
        raise ValueError("Audit and chain instances required")
    SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
    if type(audit_sequence) is not int or audit_sequence <= 0:
        raise ValueError("Positive audit sequence required")
    # History is returned descending; reject attempts to bridge stale rows.
    latest = audit.history(owner_id, candidate_id, limit=1)
    if not latest or latest[0].sequence != audit_sequence:
        raise ValueError("Only latest persisted audit event can be bridged")
    verified = chain.verify(owner_id, candidate_id)
    if verified["event_count"] and verified["status"] != "consistent_at_check":
        raise ValueError("Cannot append to inconsistent hash chain")
    receipt = chain.append(owner_id, candidate_id, audit_sequence, latest[0].status)
    return {
        "contract": "future-xsus-core.audit-chain-bridge.v1",
        "candidate_id": candidate_id,
        "audit_sequence": receipt.audit_sequence,
        "chain_ordinal": receipt.ordinal,
        "chain_head": receipt.digest,
        "release_authorized": False,
        "atomic_across_databases": False,
    }


def reconcile_review_audit_chain_v1(
    audit: SQLiteReviewAuditV1, chain: SQLiteAuditHashChainV1,
    owner_id: str, candidate_id: str, *, expected_head: str | None = None,
) -> dict:
    if not isinstance(audit, SQLiteReviewAuditV1) or not isinstance(chain, SQLiteAuditHashChainV1):
        raise ValueError("Audit and chain instances required")
    SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
    chain_result = chain.verify(owner_id, candidate_id, expected_head=expected_head)
    audit_events = list(reversed(audit.history(owner_id, candidate_id, limit=1000)))
    reasons = list(chain_result["reasons"])
    # Read the chain rows directly to compare every sequence/status pair.
    from contextlib import closing
    import sqlite3
    with closing(sqlite3.connect(chain.path)) as db:
        db.execute("BEGIN")
        chain_rows = db.execute(
            "SELECT audit_sequence,status FROM xsus_audit_hash_chain_v1 "
            "WHERE owner_id=? AND candidate_id=? ORDER BY ordinal",
            (owner_id, candidate_id),
        ).fetchall()
        db.commit()
    if len(audit_events) != len(chain_rows):
        reasons.append("audit_chain_count_mismatch")
    for event, (seq, status) in zip(audit_events, chain_rows):
        if event.sequence != seq or event.status != status:
            reasons.append("audit_chain_event_mismatch")
    if len(audit_events) >= 1000:
        reasons.append("audit_history_limit_reached")
    reasons = list(dict.fromkeys(reasons))
    return {
        "contract": "future-xsus-core.audit-chain-reconciliation.v1",
        "candidate_id": candidate_id,
        "audit_count_checked": len(audit_events),
        "chain_count": len(chain_rows),
        "chain_head": chain_result["head"],
        "status": "consistent_at_check" if not reasons else "inconsistent_or_missing",
        "reasons": reasons,
        "release_authorized": False,
        "atomic_across_databases": False,
    }
