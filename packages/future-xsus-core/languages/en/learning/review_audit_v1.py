"""Persistent owner-scoped audit of staged review checks.

Audit records contain only candidate IDs, status and reason codes.
They do not store private training prompts or model checkpoint bytes.
"""
from contextlib import closing
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import json
import sqlite3

from core.contracts.common import require_identifier
from .candidate_registry_v1 import SQLiteCandidateRegistryV1
from .staged_review_gate_v1 import assess_staged_review_v1


@dataclass(frozen=True, slots=True)
class ReviewAuditEventV1:
    sequence: int
    candidate_id: str
    status: str
    reasons: tuple[str, ...]
    checked_at: str
    release_authorized: bool = False


class SQLiteReviewAuditV1:
    def __init__(self, path: str | Path):
        if not str(path) or str(path) == ":memory:":
            raise ValueError("Persistent audit database path required")
        self.path = Path(path).absolute()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.path)) as db:
            db.execute("""CREATE TABLE IF NOT EXISTS xsus_review_audit_v1 (
                sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_id TEXT NOT NULL,
                candidate_id TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('blocked','ready_for_human_review')),
                reasons_json TEXT NOT NULL,
                checked_at TEXT NOT NULL
            )""")
            db.execute("CREATE INDEX IF NOT EXISTS xsus_review_audit_owner_candidate_v1 ON xsus_review_audit_v1(owner_id,candidate_id,sequence)")

    def record(self, owner_id: str, report: dict) -> ReviewAuditEventV1:
        require_identifier(owner_id, "owner_id")
        if type(report) is not dict or report.get("contract") != "future-xsus-core.staged-review-gate.v1":
            raise ValueError("Invalid review gate report")
        candidate_id = report.get("candidate_id")
        SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
        status = report.get("status")
        reasons = report.get("reasons")
        if status not in ("blocked", "ready_for_human_review") or type(reasons) is not list:
            raise ValueError("Invalid review status or reasons")
        if any(type(reason) is not str or not reason or len(reason) > 256 for reason in reasons):
            raise ValueError("Invalid audit reason")
        if status == "ready_for_human_review" and (reasons or report.get("review_eligible_at_check") is not True):
            raise ValueError("Inconsistent successful review")
        if status == "blocked" and (not reasons or report.get("review_eligible_at_check") is not False):
            raise ValueError("Inconsistent blocked review")
        if report.get("release_authorized") is not False:
            raise ValueError("Audit cannot record release authorization")
        timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with closing(sqlite3.connect(self.path, timeout=10)) as db:
            cursor = db.execute(
                "INSERT INTO xsus_review_audit_v1(owner_id,candidate_id,status,reasons_json,checked_at) VALUES (?,?,?,?,?)",
                (owner_id, candidate_id, status, json.dumps(reasons), timestamp),
            )
            db.commit()
            sequence = cursor.lastrowid
        return ReviewAuditEventV1(sequence, candidate_id, status, tuple(reasons), timestamp)

    def history(self, owner_id: str, candidate_id: str, *, limit: int = 100):
        SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
        if type(limit) is not int or not 1 <= limit <= 1000:
            raise ValueError("Audit history limit must be 1..1000")
        with closing(sqlite3.connect(self.path)) as db:
            rows = db.execute(
                "SELECT sequence,candidate_id,status,reasons_json,checked_at FROM xsus_review_audit_v1 "
                "WHERE owner_id=? AND candidate_id=? ORDER BY sequence DESC LIMIT ?",
                (owner_id, candidate_id, limit),
            ).fetchall()
        return tuple(ReviewAuditEventV1(seq, cid, status, tuple(json.loads(reasons)), checked)
                     for seq, cid, status, reasons, checked in rows)


def assess_and_audit_staged_review_v1(
    registry: SQLiteCandidateRegistryV1,
    audit: SQLiteReviewAuditV1,
    owner_id: str,
    candidate_id: str,
    staging_root: str | Path,
) -> dict:
    if not isinstance(audit, SQLiteReviewAuditV1):
        raise ValueError("SQLiteReviewAuditV1 required")
    report = assess_staged_review_v1(registry, owner_id, candidate_id, staging_root)
    event = audit.record(owner_id, report)
    return {
        "contract": "future-xsus-core.audited-staged-review.v1",
        "review": report,
        "audit_sequence": event.sequence,
        "audit_recorded": True,
        "release_authorized": False,
    }
