"""Single-host cooperative transactional candidate review with crash reconciliation.

A prepare event precedes snapshot replacement; a commit event follows it.
Recovery finalizes prepared operations if the snapshot contains the expected
review, or marks them aborted if the original state remains. No auto-deploy.
"""
from pathlib import Path
from .locked_audit_v1 import LockedAuditJournal
from .audit_v1 import AuditJournal
from .persistent_governance_v1 import PersistentGovernance
from .knowledge_v1 import _id


class TransactionalGovernance:
    def __init__(self, snapshot_path: str | Path, audit_path: str | Path):
        self.snapshot_path = Path(snapshot_path)
        self.audit = LockedAuditJournal(audit_path)
        if self.snapshot_path.parent.resolve() != self.audit.path.parent.resolve():
            raise ValueError("snapshot and journal must share a directory")

    @staticmethod
    def _action(kind: str, revision: int, status: str) -> str:
        return "%s:%d:%s" % (kind, revision, status)

    @staticmethod
    def _pending(entries):
        pending = {}
        for entry in entries:
            parts = entry.action.split(":")
            if len(parts) != 3 or parts[0] not in ("prepare", "commit", "abort"):
                raise ValueError("unexpected transactional audit event")
            kind, revision, status = parts
            if not revision.isdigit() or status not in ("approved_for_release_review", "rejected"):
                raise ValueError("invalid transactional audit event")
            key = (entry.owner_id, entry.candidate_id)
            if kind == "prepare":
                if key in pending:
                    raise ValueError("unresolved prior transaction")
                pending[key] = (int(revision), status)
            else:
                if pending.get(key) != (int(revision), status):
                    raise ValueError("transaction completion mismatch")
                del pending[key]
        return pending

    def recover(self):
        with self.audit._exclusive():
            journal = AuditJournal(self.audit.path)
            pending = self._pending(journal.read_verified())
            store = PersistentGovernance(self.snapshot_path)
            outcomes = []
            for (owner, candidate), (revision, status) in pending.items():
                record = store.registry.get(owner, candidate)
                if record is None:
                    raise ValueError("missing candidate during recovery")
                if record.revision == revision and record.status == status:
                    kind = "commit"
                elif record.revision == revision - 1 and record.status == "pending_review":
                    kind = "abort"
                else:
                    raise ValueError("ambiguous transaction state; manual recovery required")
                journal.append(owner, candidate, self._action(kind, revision, status))
                outcomes.append((owner, candidate, kind))
            return tuple(outcomes)

    def review(self, owner_id: str, candidate_id: str, *, reviewer_id: str,
               approve: bool, expected_revision: int, note: str):
        owner_id, candidate_id = _id(owner_id), _id(candidate_id)
        with self.audit._exclusive():
            journal = AuditJournal(self.audit.path)
            if self._pending(journal.read_verified()):
                raise ValueError("pending transaction; recover before writing")
            store = PersistentGovernance(self.snapshot_path)
            # Validate all review preconditions before recording prepare.
            record = store.registry.get(owner_id, candidate_id)
            if record is None:
                raise LookupError("candidate not found")
            if record.status != "pending_review" or record.revision != expected_revision:
                raise ValueError("invalid candidate revision or status")
            if type(approve) is not bool:
                raise ValueError("invalid approval")
            target = "approved_for_release_review" if approve else "rejected"
            updated = store.registry.review(owner_id, candidate_id,
                                            reviewer_id=reviewer_id, approve=approve,
                                            expected_revision=expected_revision, note=note)
            action = self._action("prepare", updated.revision, target)
            journal.append(owner_id, candidate_id, action)
            store.save()
            journal.append(owner_id, candidate_id,
                           self._action("commit", updated.revision, target))
            return updated
