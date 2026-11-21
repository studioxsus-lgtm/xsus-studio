"""Cross-process advisory lock for candidate training on POSIX runners."""
from contextlib import contextmanager
from pathlib import Path
import fcntl
import os
import stat


@contextmanager
def exclusive_candidate_cycle_lock_v1(report_path: Path):
    if not isinstance(report_path, Path):
        raise ValueError("Report path must be pathlib.Path")
    path=report_path.with_name(report_path.name+".cycle.lock")
    flags=os.O_CREAT|os.O_RDWR|os.O_CLOEXEC
    if hasattr(os,"O_NOFOLLOW"):
        flags|=os.O_NOFOLLOW
    descriptor=os.open(path,flags,0o600)
    try:
        info=os.fstat(descriptor)
        if not stat.S_ISREG(info.st_mode) or info.st_nlink!=1:
            raise ValueError("Unsafe cycle lock file")
        try:
            fcntl.flock(descriptor,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise RuntimeError("Candidate cycle already running") from error
        try:
            yield
        finally:
            fcntl.flock(descriptor,fcntl.LOCK_UN)
    finally:
        os.close(descriptor)
