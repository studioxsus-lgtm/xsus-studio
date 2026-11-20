"""Strict measurable proofreading quality gate over labeled English cases."""
from dataclasses import dataclass
from pathlib import Path

from .proofreading import evaluate


@dataclass(frozen=True, slots=True)
class ProofreadingThresholdsV1:
    min_cases: int = 10
    min_exact_match: float = 0.95
    max_failures: int = 0


def evaluate_proofreading_quality_gate_v1(
    path: Path, *, thresholds=ProofreadingThresholdsV1(),
    paragraphs=False, documents=False, copyedit=False,
) -> dict:
    if not isinstance(thresholds, ProofreadingThresholdsV1):
        raise ValueError("ProofreadingThresholdsV1 required")
    if (type(thresholds.min_cases) is not int or thresholds.min_cases < 1
            or type(thresholds.min_exact_match) not in (float, int)
            or not 0 <= thresholds.min_exact_match <= 1
            or type(thresholds.max_failures) is not int or thresholds.max_failures < 0):
        raise ValueError("Invalid proofreading quality thresholds")
    if not isinstance(path, Path):
        raise ValueError("Path instance required")
    if any(type(flag) is not bool for flag in (paragraphs, documents, copyedit)):
        raise ValueError("Mode flags must be boolean")
    report = evaluate(path, paragraphs=paragraphs, documents=documents, copyedit=copyedit)
    count = report["cases"]
    failures = len(report["failures"])
    exact_match = (count - failures) / count
    checks = {
        "minimum_cases": count >= thresholds.min_cases,
        "minimum_exact_match": exact_match >= thresholds.min_exact_match,
        "maximum_failures": failures <= thresholds.max_failures,
    }
    return {
        "contract": "future-xsus-core.english-proofreading-quality-gate.v1",
        "cases": count,
        "accepted": report["accepted"],
        "failures": report["failures"],
        "by_status": report["by_status"],
        "exact_match": exact_match,
        "checks": checks,
        "passed": all(checks.values()),
        "thresholds": {
            "min_cases": thresholds.min_cases,
            "min_exact_match": thresholds.min_exact_match,
            "max_failures": thresholds.max_failures,
        },
        "training_performed": False,
        "deployment_approved": False,
        "general_language_accuracy_verified": False,
    }
