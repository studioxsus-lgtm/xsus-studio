"""Non-production quality gate for labeled surface-cue comparisons.

A pass means only that specified thresholds hold on the supplied cases.
It is not evidence of general accuracy or readiness for deployment.
"""
from dataclasses import dataclass
from .adversarial_matrix_v6 import ADVERSARIAL_MATRIX_V6
from .context_guard_comparison_v6 import compare_context_guard_v6

_FIELDS = ("contrast", "reference")


@dataclass(frozen=True)
class QualityThresholdsV6:
    max_false_positives: int = 0
    max_false_negatives: int = 0
    max_regressions: int = 0
    min_cases: int = 10


def evaluate_quality_gate_v6(cases=ADVERSARIAL_MATRIX_V6, *,
                             thresholds=QualityThresholdsV6()) -> dict:
    if not isinstance(thresholds, QualityThresholdsV6):
        raise ValueError("thresholds must be QualityThresholdsV6")
    values = (thresholds.max_false_positives, thresholds.max_false_negatives,
              thresholds.max_regressions, thresholds.min_cases)
    if any(type(value) is not int or value < 0 for value in values) or thresholds.min_cases < 1:
        raise ValueError("thresholds must be nonnegative integers and min_cases >= 1")
    report = compare_context_guard_v6(cases)
    scores = report["metrics"]["context_guard"]
    regressions = report["indirect_to_context_guard"]["regressions"]
    checks = {
        "minimum_cases": report["cases"] >= thresholds.min_cases,
        "maximum_regressions": len(regressions) <= thresholds.max_regressions,
    }
    for field in _FIELDS:
        checks[f"{field}_false_positives"] = scores[field]["fp"] <= thresholds.max_false_positives
        checks[f"{field}_false_negatives"] = scores[field]["fn"] <= thresholds.max_false_negatives
    return {
        "contract": "future-xsus-core.v6.quality-gate",
        "cases": report["cases"],
        "passed": all(checks.values()),
        "checks": checks,
        "observed": {
            "false_positives": {field: scores[field]["fp"] for field in _FIELDS},
            "false_negatives": {field: scores[field]["fn"] for field in _FIELDS},
            "regressions": len(regressions),
        },
        "thresholds": {
            "max_false_positives": thresholds.max_false_positives,
            "max_false_negatives": thresholds.max_false_negatives,
            "max_regressions": thresholds.max_regressions,
            "min_cases": thresholds.min_cases,
        },
        "deployment_approved": False,
        "general_language_accuracy_verified": False,
        "human_review_required": True,
    }
