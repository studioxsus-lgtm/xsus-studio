"""POSIX advisory-locked audit journal with exclusive append and replay.

All writers must use this wrapper and the same lock path. Advisory locks do
not protect against uncooperative writers or hostile filesystem mutation.
"""
from contextlib import contextmanager
from pathlib import Path
import os
import stat
import fcntl
from .audit_v1 import AuditJournal
from .knowledge_v1 import _id, _text


class LockedAuditJournal:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.lock_path = self.path.with_name(self.path.name + ".lock")
        if not self.path.parent.is_dir():
            raise ValueError("audit directory must exist")

    @contextmanager
    def _exclusive(self):
        flags = os.O_CREAT | os.O_RDWR
        if hasattr(os, "O_NOFOLLOW"):
            flags |= os.O_NOFOLLOW
        fd = os.open(self.lock_path, flags, 0o600)
        try:
            if not stat.S_ISREG(os.fstat(fd).st_mode):
                raise ValueError("audit lock must be regular file")
            fcntl.flock(fd, fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)

    def append(self, owner_id: str, candidate_id: str, action: str):
        owner_id, candidate_id, action = _id(owner_id), _id(candidate_id), _text(action)
        with self._exclusive():
            journal = AuditJournal(self.path)
            return journal.append(owner_id, candidate_id, action)

    def read_verified(self):
        with self._exclusive():
            return AuditJournal(self.path).read_verified()
