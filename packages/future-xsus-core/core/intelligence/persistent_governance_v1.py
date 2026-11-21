"""Crash-conscious JSON snapshot persistence for governance records.

Single-process exclusive ownership required. This is not a distributed
transaction log or an authenticated audit system.
"""
from dataclasses import asdict
from hashlib import sha256
import json
import os
from pathlib import Path
import tempfile
from .governance_v1 import CandidateGovernance, CandidateRecord, MAX_RECORDS

FORMAT_VERSION = 1


class PersistentGovernance:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        if not self.path.parent.is_dir():
            raise ValueError("snapshot directory must already exist")
        self.registry = CandidateGovernance()
        if self.path.exists():
            self.reload()

    @staticmethod
    def _payload(records: tuple[CandidateRecord, ...]) -> bytes:
        data = {"version": FORMAT_VERSION, "records": [asdict(r) for r in records]}
        return json.dumps(data, sort_keys=True, separators=(",", ":")).encode("utf-8")

    def save(self) -> str:
        records = tuple(sorted(self.registry._records.values(),
                               key=lambda r: (r.owner_id, r.candidate_id)))
        payload = self._payload(records)
        digest = sha256(payload).hexdigest()
        envelope = json.dumps({"sha256": digest, "payload": json.loads(payload)},
                              sort_keys=True, separators=(",", ":")).encode("utf-8")
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(dir=self.path.parent,
                                             prefix=".governance-", suffix=".tmp",
                                             delete=False) as handle:
                temporary = Path(handle.name)
                handle.write(envelope)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, self.path)
            temporary = None
            if hasattr(os, "O_DIRECTORY"):
                directory_fd = os.open(self.path.parent, os.O_RDONLY | os.O_DIRECTORY)
                try:
                    os.fsync(directory_fd)
                finally:
                    os.close(directory_fd)
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)
        return digest

    def reload(self) -> int:
        raw = self.path.read_bytes()
        envelope = json.loads(raw)
        if not isinstance(envelope, dict) or set(envelope) != {"sha256", "payload"}:
            raise ValueError("invalid snapshot envelope")
        payload = envelope["payload"]
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
        if sha256(canonical).hexdigest() != envelope["sha256"]:
            raise ValueError("snapshot checksum mismatch")
        if not isinstance(payload, dict) or payload.get("version") != FORMAT_VERSION:
            raise ValueError("unsupported snapshot version")
        items = payload.get("records")
        if not isinstance(items, list) or len(items) > MAX_RECORDS:
            raise ValueError("invalid snapshot records")
        restored = {}
        for item in items:
            if not isinstance(item, dict) or set(item) != set(CandidateRecord.__dataclass_fields__):
                raise ValueError("invalid snapshot record")
            record = CandidateRecord(**item)
            if record.status not in ("pending_review", "approved_for_release_review", "rejected"):
                raise ValueError("invalid candidate status")
            if type(record.revision) is not int or record.revision not in (0, 1):
                raise ValueError("invalid candidate revision")
            if (record.status == "pending_review") != (record.revision == 0):
                raise ValueError("inconsistent candidate revision")
            key = record.owner_id, record.candidate_id
            if key in restored:
                raise ValueError("duplicate candidate record")
            restored[key] = record
        replacement = CandidateGovernance()
        replacement._records = restored
        self.registry = replacement
        return len(restored)
