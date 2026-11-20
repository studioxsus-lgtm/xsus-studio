"""Append-only-by-API SHA-256 chain for English candidate audit receipts.

A local DB administrator can rewrite the chain. External anchoring is absent.
"""
from contextlib import closing
from dataclasses import dataclass
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re
import sqlite3
import hmac

from .candidate_registry_v1 import SQLiteCandidateRegistryV1

_HEX = re.compile(r"^[a-f0-9]{64}$")
_GENESIS = "0" * 64


def _hash_event(owner, candidate, ordinal, audit_sequence, status, previous):
    payload = json.dumps({
        "version": 1, "owner": owner, "candidate": candidate,
        "ordinal": ordinal, "audit_sequence": audit_sequence,
        "status": status, "previous": previous,
    }, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


@dataclass(frozen=True, slots=True)
class AuditChainReceiptV1:
    ordinal: int
    audit_sequence: int
    digest: str
    previous_digest: str
    release_authorized: bool = False


class SQLiteAuditHashChainV1:
    def __init__(self, path: str | Path):
        if not str(path) or str(path) == ":memory:":
            raise ValueError("Persistent database path required")
        self.path = Path(path).absolute()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.path)) as db:
            db.execute("""CREATE TABLE IF NOT EXISTS xsus_audit_hash_chain_v1 (
                owner_id TEXT NOT NULL,
                candidate_id TEXT NOT NULL,
                ordinal INTEGER NOT NULL CHECK(ordinal > 0),
                audit_sequence INTEGER NOT NULL CHECK(audit_sequence > 0),
                status TEXT NOT NULL CHECK(status IN ('blocked','ready_for_human_review')),
                previous_digest TEXT NOT NULL,
                digest TEXT NOT NULL,
                PRIMARY KEY(owner_id,candidate_id,ordinal),
                UNIQUE(owner_id,candidate_id,audit_sequence)
            )""")

    def append(self, owner_id: str, candidate_id: str, audit_sequence: int, status: str):
        SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
        if type(audit_sequence) is not int or audit_sequence <= 0:
            raise ValueError("Positive audit sequence required")
        if status not in ("blocked", "ready_for_human_review"):
            raise ValueError("Invalid audit status")
        with closing(sqlite3.connect(self.path, timeout=10)) as db:
            db.execute("BEGIN IMMEDIATE")
            try:
                last = db.execute(
                    "SELECT ordinal,digest,audit_sequence FROM xsus_audit_hash_chain_v1 "
                    "WHERE owner_id=? AND candidate_id=? ORDER BY ordinal DESC LIMIT 1",
                    (owner_id, candidate_id),
                ).fetchone()
                ordinal = last[0] + 1 if last else 1
                previous = last[1] if last else _GENESIS
                if last and audit_sequence <= last[2]:
                    raise ValueError("Audit sequence must increase")
                digest = _hash_event(owner_id, candidate_id, ordinal, audit_sequence, status, previous)
                db.execute("INSERT INTO xsus_audit_hash_chain_v1 VALUES (?,?,?,?,?,?,?)",
                           (owner_id, candidate_id, ordinal, audit_sequence, status, previous, digest))
                db.commit()
            except BaseException:
                db.rollback()
                raise
        return AuditChainReceiptV1(ordinal, audit_sequence, digest, previous)

    def verify(self, owner_id: str, candidate_id: str, *, expected_head: str | None = None):
        SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
        if expected_head is not None and (type(expected_head) is not str or not _HEX.fullmatch(expected_head)):
            raise ValueError("Expected head must be SHA-256")
        with closing(sqlite3.connect(self.path)) as db:
            db.execute("BEGIN")
            rows = db.execute(
                "SELECT ordinal,audit_sequence,status,previous_digest,digest "
                "FROM xsus_audit_hash_chain_v1 WHERE owner_id=? AND candidate_id=? ORDER BY ordinal",
                (owner_id, candidate_id),
            ).fetchall()
            db.commit()
        reasons = []
        previous = _GENESIS
        last_seq = 0
        for index, (ordinal, seq, status, prev, digest) in enumerate(rows, 1):
            if ordinal != index or seq <= last_seq:
                reasons.append("invalid_chain_order")
            if status not in ("blocked", "ready_for_human_review"):
                reasons.append("invalid_chain_status")
            if not hmac.compare_digest(prev, previous):
                reasons.append("broken_previous_link")
            expected = _hash_event(owner_id, candidate_id, ordinal, seq, status, prev)
            if not hmac.compare_digest(digest, expected):
                reasons.append("event_digest_mismatch")
            previous = digest
            last_seq = seq
        if not rows:
            reasons.append("empty_chain")
        if expected_head is not None and not hmac.compare_digest(previous, expected_head):
            reasons.append("head_anchor_mismatch")
        return {
            "contract": "future-xsus-core.audit-hash-chain.v1",
            "event_count": len(rows),
            "head": previous if rows else None,
            "status": "consistent_at_check" if not reasons else "inconsistent_or_missing",
            "reasons": list(dict.fromkeys(reasons)),
            "externally_anchored": False,
            "deletion_detection_guaranteed": False,
            "release_authorized": False,
        }
