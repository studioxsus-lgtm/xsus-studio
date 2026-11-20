"""Serialized, restartable tail recovery using the chain SQLite write lock.

No cross-database atomicity or external tamper-proof guarantee.
"""
from contextlib import closing
import sqlite3

from .candidate_registry_v1 import SQLiteCandidateRegistryV1
from .review_audit_v1 import SQLiteReviewAuditV1
from .audit_hash_chain_v1 import SQLiteAuditHashChainV1, _GENESIS, _hash_event
from .audit_chain_bridge_v1 import reconcile_review_audit_chain_v1


def recover_audit_chain_tail_v2(
    audit: SQLiteReviewAuditV1, chain: SQLiteAuditHashChainV1,
    owner_id: str, candidate_id: str, *, max_events: int = 1000,
) -> dict:
    if not isinstance(audit, SQLiteReviewAuditV1) or not isinstance(chain, SQLiteAuditHashChainV1):
        raise ValueError("Audit and chain instances required")
    SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
    if type(max_events) is not int or not 1 <= max_events <= 1000:
        raise ValueError("max_events must be 1..1000")
    # Read audit snapshot before acquiring chain writer lock. A concurrent
    # audit append may still happen; final reconciliation detects this.
    with closing(sqlite3.connect(audit.path, timeout=10)) as adb:
        adb.execute("BEGIN")
        events = adb.execute(
            "SELECT sequence,status FROM xsus_review_audit_v1 "
            "WHERE owner_id=? AND candidate_id=? ORDER BY sequence",
            (owner_id, candidate_id),
        ).fetchall()
        adb.commit()
    if not events or len(events) > max_events:
        raise ValueError("Empty or oversized audit history")
    appended = 0
    with closing(sqlite3.connect(chain.path, timeout=10)) as cdb:
        cdb.execute("BEGIN IMMEDIATE")
        try:
            rows = cdb.execute(
                "SELECT ordinal,audit_sequence,status,previous_digest,digest "
                "FROM xsus_audit_hash_chain_v1 WHERE owner_id=? AND candidate_id=? "
                "ORDER BY ordinal", (owner_id, candidate_id),
            ).fetchall()
            if len(rows) > len(events):
                raise ValueError("Chain longer than audit history")
            previous = _GENESIS
            for index, (ordinal, seq, status, prev, digest) in enumerate(rows, 1):
                if (ordinal != index or (seq, status) != events[index - 1]
                        or prev != previous
                        or digest != _hash_event(owner_id, candidate_id, ordinal, seq, status, prev)):
                    raise ValueError("Existing chain integrity or audit prefix mismatch")
                previous = digest
            for seq, status in events[len(rows):]:
                ordinal = len(rows) + appended + 1
                digest = _hash_event(owner_id, candidate_id, ordinal, seq, status, previous)
                cdb.execute(
                    "INSERT INTO xsus_audit_hash_chain_v1 VALUES (?,?,?,?,?,?,?)",
                    (owner_id, candidate_id, ordinal, seq, status, previous, digest),
                )
                previous = digest
                appended += 1
            cdb.commit()
        except BaseException:
            cdb.rollback()
            raise
    # Separate databases cannot share this transaction. Fail closed if
    # another audit writer changed history before reconciliation.
    result = reconcile_review_audit_chain_v1(audit, chain, owner_id, candidate_id)
    return {
        "contract": "future-xsus-core.audit-chain-tail-recovery.v2",
        "candidate_id": candidate_id,
        "recovered_events": appended,
        "status": result["status"],
        "reasons": result["reasons"],
        "chain_head": result["chain_head"],
        "release_authorized": False,
        "atomic_across_databases": False,
        "chain_append_transactional": True,
    }
