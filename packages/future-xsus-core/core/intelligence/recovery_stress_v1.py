"""Deterministic transactional recovery fault-injection harness.

Injects controlled failures around journal preparation, snapshot persistence,
and commit append. It does not simulate kernel SIGKILL or hardware power loss.
"""
from dataclasses import dataclass
from pathlib import Path
import tempfile
from .audit_v1 import AuditJournal
from .improvement_v1 import ImprovementVerdict
from .persistent_governance_v1 import PersistentGovernance
from .transactional_governance_v1 import TransactionalGovernance


@dataclass(frozen=True, slots=True)
class RecoveryScenario:
    point: str
    outcome: str
    final_status: str
    journal_entries: int


@dataclass(frozen=True, slots=True)
class RecoveryStressReport:
    status: str
    scenarios: tuple[RecoveryScenario, ...]
    limitations: tuple[str, ...]


class RecoveryStressHarness:
    POINTS = ("before_prepare", "after_prepare", "after_snapshot", "after_commit")

    def run(self) -> RecoveryStressReport:
        results = []
        for point in self.POINTS:
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                snapshot, audit = root / "governance.json", root / "audit.jsonl"
                store = PersistentGovernance(snapshot)
                verdict = ImprovementVerdict("eligible_for_manual_review", "proposal1",
                                             1, 2, 2, (), ("fixed",), ())
                store.registry.register("owner", "candidate", verdict)
                store.save()
                journal = AuditJournal(audit)
                if point != "before_prepare":
                    journal.append("owner", "candidate",
                                   "prepare:1:approved_for_release_review")
                if point in ("after_snapshot", "after_commit"):
                    store.registry.review("owner", "candidate", reviewer_id="reviewer",
                                          approve=True, expected_revision=0,
                                          note="Authorized evaluation")
                    store.save()
                if point == "after_commit":
                    journal.append("owner", "candidate",
                                   "commit:1:approved_for_release_review")
                transaction = TransactionalGovernance(snapshot, audit)
                recovered = transaction.recover()
                final = PersistentGovernance(snapshot).registry.get("owner", "candidate")
                entries = AuditJournal(audit).read_verified()
                expected_recovery = {
                    "before_prepare": (),
                    "after_prepare": (("owner", "candidate", "abort"),),
                    "after_snapshot": (("owner", "candidate", "commit"),),
                    "after_commit": (),
                }[point]
                expected_status = ("pending_review" if point in
                                   ("before_prepare", "after_prepare")
                                   else "approved_for_release_review")
                passed = (recovered == expected_recovery and
                          final.status == expected_status and
                          transaction.recover() == ())
                results.append(RecoveryScenario(point, "pass" if passed else "fail",
                                                final.status, len(entries)))
        return RecoveryStressReport(
            "pass" if all(s.outcome == "pass" for s in results) else "fail",
            tuple(results),
            ("deterministic_fault_injection_only",
             "no_real_process_kill_or_power_failure",
             "single_host_cooperative_writers"))
