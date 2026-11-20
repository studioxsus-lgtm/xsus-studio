"""Fail-closed recovery of missing *tail* audit-chain receipts.

Replays only an exact, verified prefix; never rewrites existing receipts.
"""
from contextlib import closing
import sqlite3

from .candidate_registry_v1 import SQLiteCandidateRegistryV1
from .review_audit_v1 import SQLiteReviewAuditV1
from .audit_hash_chain_v1 import SQLiteAuditHashChainV1


def recover_audit_chain_tail_v1(
    audit: SQLiteReviewAuditV1, chain: SQLiteAuditHashChainV1,
    owner_id: str, candidate_id: str, *, max_events: int = 1000,
) -> dict:
    if not isinstance(audit, SQLiteReviewAuditV1) or not isinstance(chain, SQLiteAuditHashChainV1):
        raise ValueError("Audit and chain instances required")
    SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
    if type(max_events) is not int or not 1 <= max_events <= 1000:
        raise ValueError("max_events must be 1..1000")
    with closing(sqlite3.connect(audit.path, timeout=10)) as db:
        db.execute("BEGIN")
        audit_rows = db.execute(
            "SELECT sequence,status FROM xsus_review_audit_v1 "
            "WHERE owner_id=? AND candidate_id=? ORDER BY sequence",
            (owner_id, candidate_id),
        ).fetchall()
        db.commit()
    if not audit_rows:
        raise ValueError("No audit events to recover")
    if len(audit_rows) > max_events:
        raise ValueError("Audit history exceeds recovery limit")
    with closing(sqlite3.connect(chain.path, timeout=10)) as db:
        db.execute("BEGIN")
        chain_rows = db.execute(
            "SELECT audit_sequence,status FROM xsus_audit_hash_chain_v1 "
            "WHERE owner_id=? AND candidate_id=? ORDER BY ordinal",
            (owner_id, candidate_id),
        ).fetchall()
        db.commit()
    if chain_rows and chain.verify(owner_id, candidate_id)["status"] != "consistent_at_check":
        raise ValueError("Existing chain integrity failed")
    if len(chain_rows) > len(audit_rows) or chain_rows != audit_rows[:len(chain_rows)]:
        raise ValueError("Chain is not an exact prefix of persisted audit")
    appended = 0
    for seq, status in audit_rows[len(chain_rows):]:
        # Each append uses the chain's serialized write transaction.
        # Concurrent recovery of the same receipt fails closed.
        chain.append(owner_id, candidate_id, seq, status)
        appended += 1
    # Verify against the current audit snapshot. A concurrent audit append
    # may make this result stale, so report it explicitly.
    from .audit_chain_bridge_v1 import reconcile_review_audit_chain_v1
    result = reconcile_review_audit_chain_v1(audit, chain, owner_id, candidate_id)
    return {
        "contract": "future-xsus-core.audit-chain-tail-recovery.v1",
        "candidate_id": candidate_id,
        "recovered_events": appended,
        "status": result["status"],
        "reasons": result["reasons"],
        "chain_head": result["chain_head"],
        "release_authorized": False,
        "atomic_across_databases": False,
    }
