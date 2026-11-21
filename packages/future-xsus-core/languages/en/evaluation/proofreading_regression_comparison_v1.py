"""Compare frozen, labeled proofreading predictions across versions.

No inference is performed here. Both snapshots must refer to the same
independently labeled dataset fingerprint and case IDs.
"""
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ProofreadingPredictionV1:
    case_id: str
    status: str
    output: str


def compare_proofreading_versions_v1(
    reference, baseline, candidate, *, dataset_sha256,
    max_regressions=0, min_improvements=0,
):
    if (type(dataset_sha256) is not str or len(dataset_sha256) != 64
            or any(c not in "0123456789abcdef" for c in dataset_sha256)):
        raise ValueError("Valid lowercase dataset SHA-256 required")
    if (type(max_regressions) is not int or max_regressions < 0
            or type(min_improvements) is not int or min_improvements < 0):
        raise ValueError("Nonnegative integer thresholds required")
    if type(reference) not in (list, tuple) or not 1 <= len(reference) <= 10000:
        raise ValueError("Bounded reference sequence required")
    if type(baseline) not in (list, tuple) or type(candidate) not in (list, tuple):
        raise ValueError("Prediction sequences required")
    def index(items):
        found = {}
        for item in items:
            if (not isinstance(item, ProofreadingPredictionV1)
                    or type(item.case_id) is not str or not item.case_id
                    or len(item.case_id) > 128 or item.case_id in found
                    or type(item.status) is not str or type(item.output) is not str
                    or item.status not in ("corrected", "partial", "unchanged", "review_required")):
                raise ValueError("Invalid or duplicate prediction")
            found[item.case_id] = item
        return found
    expected = index(reference)
    old = index(baseline)
    new = index(candidate)
    if set(old) != set(expected) or set(new) != set(expected):
        raise ValueError("Case IDs must exactly match reference")
    improvements, regressions, unchanged_correct, unchanged_wrong = [], [], [], []
    for case in reference:
        previous, current = old[case.case_id], new[case.case_id]
        was_correct = (previous.status, previous.output) == (case.status, case.output)
        is_correct = (current.status, current.output) == (case.status, case.output)
        if was_correct and not is_correct:
            regressions.append(case.case_id)
        elif not was_correct and is_correct:
            improvements.append(case.case_id)
        elif was_correct:
            unchanged_correct.append(case.case_id)
        else:
            unchanged_wrong.append(case.case_id)
    baseline_correct = len(regressions) + len(unchanged_correct)
    candidate_correct = len(improvements) + len(unchanged_correct)
    checks = {
        "maximum_regressions": len(regressions) <= max_regressions,
        "minimum_improvements": len(improvements) >= min_improvements,
    }
    return {
        "contract": "future-xsus-core.english-proofreading-regression.v1",
        "dataset_sha256": dataset_sha256,
        "case_count": len(reference),
        "baseline_correct": baseline_correct,
        "candidate_correct": candidate_correct,
        "baseline_accuracy": baseline_correct / len(reference),
        "candidate_accuracy": candidate_correct / len(reference),
        "regressions": regressions, "improvements": improvements,
        "unchanged_correct": unchanged_correct,
        "unchanged_wrong": unchanged_wrong,
        "checks": checks, "passed": all(checks.values()),
        "prediction_origin_verified": False,
        "training_performed": False, "release_authorized": False,
    }
