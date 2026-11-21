"""Subprocess-only crash boundary worker; never import into production services."""
import os
from pathlib import Path
import signal
import sys
from .audit_v1 import AuditJournal
from .improvement_v1 import ImprovementVerdict
from .persistent_governance_v1 import PersistentGovernance


def main():
    if len(sys.argv) != 4:
        raise SystemExit("usage: python -m ...crash_worker_v1 DIR POINT READY")
    root, point, ready = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
    if point not in ("before_prepare", "after_prepare", "after_snapshot", "after_commit"):
        raise ValueError("invalid crash point")
    snapshot, audit = root / "snapshot.json", root / "audit.jsonl"
    store = PersistentGovernance(snapshot)
    verdict = ImprovementVerdict("eligible_for_manual_review", "proposal1",
                                 1, 2, 2, (), ("fixed",), ())
    store.registry.register("owner", "candidate", verdict)
    store.save()
    journal = AuditJournal(audit)
    if point != "before_prepare":
        journal.append("owner", "candidate", "prepare:1:approved_for_release_review")
    if point in ("after_snapshot", "after_commit"):
        store.registry.review("owner", "candidate", reviewer_id="reviewer",
                              approve=True, expected_revision=0, note="Authorized")
        store.save()
    if point == "after_commit":
        journal.append("owner", "candidate", "commit:1:approved_for_release_review")
    # Durable handshake ensures parent kills at the requested boundary.
    with ready.open("w", encoding="ascii") as stream:
        stream.write(point)
        stream.flush()
        os.fsync(stream.fileno())
    signal.pause()


if __name__ == "__main__":
    main()
