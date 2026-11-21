"""Append-only hash-chained decision audit for a single exclusive writer.

A hash chain detects accidental modifications; it is not authenticated,
tamper-proof against an adversary with write access, or distributed consensus.
"""
from dataclasses import dataclass
from hashlib import sha256
import json
import os
from pathlib import Path
from .knowledge_v1 import _id, _text


@dataclass(frozen=True, slots=True)
class AuditEntry:
    sequence: int
    owner_id: str
    candidate_id: str
    action: str
    previous_hash: str
    digest: str


class AuditJournal:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        if not self.path.parent.is_dir():
            raise ValueError("audit directory must exist")
        self._entries = self.read_verified()

    @staticmethod
    def _digest(sequence: int, owner_id: str, candidate_id: str,
                action: str, previous_hash: str) -> str:
        data = json.dumps([sequence, owner_id, candidate_id, action, previous_hash],
                          separators=(",", ":"), ensure_ascii=True).encode()
        return sha256(data).hexdigest()

    def read_verified(self) -> tuple[AuditEntry, ...]:
        if not self.path.exists():
            return ()
        entries = []
        previous = "0" * 64
        with self.path.open("r", encoding="utf-8") as stream:
            for line in stream:
                record = json.loads(line)
                if not isinstance(record, dict) or set(record) != set(AuditEntry.__dataclass_fields__):
                    raise ValueError("invalid audit record")
                entry = AuditEntry(**record)
                if type(entry.sequence) is not int or entry.sequence != len(entries) + 1:
                    raise ValueError("audit sequence mismatch")
                if entry.previous_hash != previous:
                    raise ValueError("audit chain broken")
                if entry.digest != self._digest(entry.sequence, entry.owner_id,
                                                entry.candidate_id, entry.action, previous):
                    raise ValueError("audit digest mismatch")
                entries.append(entry)
                previous = entry.digest
        return tuple(entries)

    def append(self, owner_id: str, candidate_id: str, action: str) -> AuditEntry:
        owner_id, candidate_id, action = _id(owner_id), _id(candidate_id), _text(action)
        # Fail closed if journal changed outside this instance.
        if self.read_verified() != self._entries:
            raise ValueError("audit journal changed externally")
        previous = self._entries[-1].digest if self._entries else "0" * 64
        sequence = len(self._entries) + 1
        entry = AuditEntry(sequence, owner_id, candidate_id, action, previous,
                           self._digest(sequence, owner_id, candidate_id, action, previous))
        line = json.dumps(entry.__dict__ if hasattr(entry, "__dict__") else
                          {field: getattr(entry, field) for field in AuditEntry.__dataclass_fields__},
                          sort_keys=True, separators=(",", ":")) + "\n"
        with self.path.open("a", encoding="utf-8") as stream:
            stream.write(line)
            stream.flush()
            os.fsync(stream.fileno())
        self._entries += (entry,)
        return entry
