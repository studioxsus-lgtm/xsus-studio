"""Persistent, owner-scoped, fail-closed candidate review registry.

Registry decisions are advisory and never grant release. Only quarantine
transitions are permitted after registration. No model bytes are stored.
"""
from contextlib import closing
from dataclasses import dataclass
from pathlib import Path
import json
import re
import sqlite3

from core.contracts.common import require_identifier
from .candidate_quarantine_v1 import CandidateQuarantineDecisionV1

_ID = re.compile(r"^[a-f0-9]{64}$")
_STATES = {"quarantined", "pending_human_review"}


@dataclass(frozen=True, slots=True)
class RegisteredCandidateV1:
    candidate_id: str
    owner_id: str
    status: str
    reasons: tuple[str, ...]
    revision: int
    release_authorized: bool = False


class SQLiteCandidateRegistryV1:
    def __init__(self, path: str | Path):
        if not str(path) or str(path) == ":memory:":
            raise ValueError("Persistent SQLite path required")
        self.path = Path(path).absolute()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS xsus_candidate_registry_v1 (
                owner_id TEXT NOT NULL,
                candidate_id TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('quarantined','pending_human_review')),
                reasons_json TEXT NOT NULL,
                revision INTEGER NOT NULL CHECK(revision >= 1),
                PRIMARY KEY(owner_id,candidate_id)
            )""")
            db.execute("""CREATE TABLE IF NOT EXISTS xsus_candidate_events_v1 (
                owner_id TEXT NOT NULL,
                candidate_id TEXT NOT NULL,
                revision INTEGER NOT NULL,
                status TEXT NOT NULL,
                reasons_json TEXT NOT NULL,
                PRIMARY KEY(owner_id,candidate_id,revision)
            )""")

    def _connect(self):
        return sqlite3.connect(self.path, timeout=10)

    @staticmethod
    def _validate(owner_id, candidate_id):
        require_identifier(owner_id, "owner_id")
        if type(candidate_id) is not str or not _ID.fullmatch(candidate_id):
            raise ValueError("Candidate ID must be a lowercase SHA-256 digest")

    @staticmethod
    def _to_record(row):
        return RegisteredCandidateV1(
            candidate_id=row[0], owner_id=row[1], status=row[2],
            reasons=tuple(json.loads(row[3])), revision=row[4],
        )

    def register(self, owner_id: str, candidate_id: str, decision: CandidateQuarantineDecisionV1):
        self._validate(owner_id, candidate_id)
        if not isinstance(decision, CandidateQuarantineDecisionV1):
            raise ValueError("CandidateQuarantineDecisionV1 required")
        if decision.status not in _STATES or decision.release_authorized is not False or decision.human_review_required is not True or decision.artifact_quarantined_on_disk is not False:
            raise ValueError("Unsafe candidate decision")
        if decision.status == "pending_human_review" and decision.reasons:
            raise ValueError("Review-pending candidate cannot contain rejection reasons")
        if decision.status == "quarantined" and not decision.reasons:
            raise ValueError("Quarantine requires a reason")
        reasons_json = json.dumps(list(decision.reasons), ensure_ascii=False)
        with closing(self._connect()) as db:
            db.execute("BEGIN IMMEDIATE")
            try:
                existing = db.execute(
                    "SELECT 1 FROM xsus_candidate_registry_v1 WHERE owner_id=? AND candidate_id=?",
                    (owner_id, candidate_id),
                ).fetchone()
                if existing:
                    raise ValueError("Candidate already registered; cannot overwrite review history")
                db.execute("INSERT INTO xsus_candidate_registry_v1 VALUES (?,?,?,?,1)",
                           (owner_id, candidate_id, decision.status, reasons_json))
                db.execute("INSERT INTO xsus_candidate_events_v1 VALUES (?,?,?,?,?)",
                           (owner_id, candidate_id, 1, decision.status, reasons_json))
                db.commit()
            except BaseException:
                db.rollback()
                raise
        return self.get(owner_id, candidate_id)

    def get(self, owner_id: str, candidate_id: str):
        self._validate(owner_id, candidate_id)
        with closing(self._connect()) as db:
            row = db.execute(
                "SELECT candidate_id,owner_id,status,reasons_json,revision "
                "FROM xsus_candidate_registry_v1 WHERE owner_id=? AND candidate_id=?",
                (owner_id, candidate_id),
            ).fetchone()
        if row is None:
            raise KeyError("Candidate not found for owner")
        return self._to_record(row)

    def quarantine(self, owner_id: str, candidate_id: str, reason: str):
        self._validate(owner_id, candidate_id)
        if type(reason) is not str or not reason.strip() or len(reason) > 256:
            raise ValueError("Nonempty quarantine reason required (max 256 characters)")
        with closing(self._connect()) as db:
            db.execute("BEGIN IMMEDIATE")
            try:
                row = db.execute(
                    "SELECT status,reasons_json,revision FROM xsus_candidate_registry_v1 "
                    "WHERE owner_id=? AND candidate_id=?", (owner_id, candidate_id),
                ).fetchone()
                if row is None:
                    raise KeyError("Candidate not found for owner")
                status, previous, revision = row
                reasons = json.loads(previous)
                if reason not in reasons:
                    reasons.append(reason)
                if status == "quarantined" and reasons == json.loads(previous):
                    db.commit()
                    return self.get(owner_id, candidate_id)
                revision += 1
                reasons_json = json.dumps(reasons, ensure_ascii=False)
                db.execute(
                    "UPDATE xsus_candidate_registry_v1 SET status='quarantined',reasons_json=?,revision=? "
                    "WHERE owner_id=? AND candidate_id=?",
                    (reasons_json, revision, owner_id, candidate_id),
                )
                db.execute("INSERT INTO xsus_candidate_events_v1 VALUES (?,?,?,?,?)",
                           (owner_id, candidate_id, revision, "quarantined", reasons_json))
                db.commit()
            except BaseException:
                db.rollback()
                raise
        return self.get(owner_id, candidate_id)

    def history(self, owner_id: str, candidate_id: str):
        self._validate(owner_id, candidate_id)
        self.get(owner_id, candidate_id)
        with closing(self._connect()) as db:
            rows = db.execute(
                "SELECT revision,status,reasons_json FROM xsus_candidate_events_v1 "
                "WHERE owner_id=? AND candidate_id=? ORDER BY revision",
                (owner_id, candidate_id),
            ).fetchall()
        return tuple({"revision": revision, "status": status, "reasons": tuple(json.loads(reasons))}
                     for revision, status, reasons in rows)

    def release_check(self, owner_id: str, candidate_id: str):
        """Fail closed: this registry has no release-authorizing operation."""
        record = self.get(owner_id, candidate_id)
        return {"candidate_id": record.candidate_id, "status": record.status,
                "release_authorized": False, "requires_independent_release_gate": True}
