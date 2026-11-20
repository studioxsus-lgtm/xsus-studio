"""Read-only structural consistency checks for owner-scoped review audit rows.

Not a cryptographic or deletion-proof audit mechanism.
"""
from contextlib import closing
from datetime import datetime, timezone
import json
import sqlite3

from .candidate_registry_v1 import SQLiteCandidateRegistryV1
from .review_audit_v1 import SQLiteReviewAuditV1


def inspect_review_audit_consistency_v1(
    audit: SQLiteReviewAuditV1, owner_id: str, candidate_id: str,
    *, expected_latest_sequence: int | None = None,
) -> dict:
    if not isinstance(audit, SQLiteReviewAuditV1):
        raise ValueError("SQLiteReviewAuditV1 required")
    SQLiteCandidateRegistryV1._validate(owner_id, candidate_id)
    if expected_latest_sequence is not None and (
        type(expected_latest_sequence) is not int or expected_latest_sequence <= 0
    ):
        raise ValueError("Expected sequence must be a positive integer")
    reasons = []
    # Read all matching rows within one SQLite read transaction.
    with closing(sqlite3.connect(audit.path, timeout=10)) as db:
        db.execute("BEGIN")
        rows = db.execute(
            "SELECT sequence,candidate_id,status,reasons_json,checked_at "
            "FROM xsus_review_audit_v1 WHERE owner_id=? AND candidate_id=? "
            "ORDER BY sequence ASC", (owner_id, candidate_id)
        ).fetchall()
        db.commit()
    if not rows:
        reasons.append("no_audit_events")
    previous_seq = 0
    previous_time = None
    for seq, cid, status, raw_reasons, checked_at in rows:
        if type(seq) is not int or seq <= previous_seq:
            reasons.append("invalid_sequence_order")
        previous_seq = seq
        if cid != candidate_id:
            reasons.append("candidate_id_mismatch")
        try:
            parsed = json.loads(raw_reasons)
        except (TypeError, ValueError):
            parsed = None
        if type(parsed) is not list or any(
            type(reason) is not str or not reason or len(reason) > 256
            for reason in parsed
        ):
            reasons.append("invalid_reason_encoding")
        elif (status == "blocked" and not parsed) or (
            status == "ready_for_human_review" and parsed
        ):
            reasons.append("inconsistent_status_reasons")
        if status not in ("blocked", "ready_for_human_review"):
            reasons.append("invalid_review_status")
        try:
            stamp = datetime.fromisoformat(checked_at)
            if stamp.tzinfo is None or stamp.utcoffset() is None:
                raise ValueError("Timezone required")
            stamp = stamp.astimezone(timezone.utc)
        except (TypeError, ValueError, OverflowError):
            reasons.append("invalid_audit_timestamp")
            continue
        if previous_time is not None and stamp < previous_time:
            reasons.append("timestamp_regression")
        previous_time = stamp
    latest = rows[-1][0] if rows else None
    if expected_latest_sequence is not None and latest != expected_latest_sequence:
        reasons.append("latest_sequence_mismatch")
    reasons = list(dict.fromkeys(reasons))
    return {
        "contract": "future-xsus-core.audit-consistency.v1",
        "candidate_id": candidate_id,
        "event_count": len(rows),
        "latest_sequence": latest,
        "status": "consistent_at_check" if not reasons else "inconsistent_or_missing",
        "reasons": reasons,
        "release_authorized": False,
        "tamper_evident": False,
        "deletion_detection_guaranteed": False,
    }
