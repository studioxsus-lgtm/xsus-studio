"""Fail-closed per-category quality assessment from verified snapshot comparisons."""
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class CategoryCaseV1:
    case_id: str
    category: str


@dataclass(frozen=True, slots=True)
class CategoryThresholdV1:
    min_cases: int = 2
    min_accuracy: float = 0.8
    max_regressions: int = 0


def evaluate_proofreading_categories_v1(
    comparison, categories, *, thresholds=None,
    default_threshold=CategoryThresholdV1(),
):
    if type(comparison) is not dict or comparison.get("contract") != "future-xsus-core.proofreading-snapshot-comparison.v1":
        raise ValueError("Verified snapshot comparison report required")
    if (comparison.get("trusted_digest_checked") is not True
            or comparison.get("single_snapshot_used") is not True
            or comparison.get("artifacts_authenticated_at_check") is not True):
        raise ValueError("Comparison verification flags required")
    if not isinstance(default_threshold, CategoryThresholdV1):
        raise ValueError("Invalid default threshold")
    if thresholds is None:
        thresholds = {}
    if type(thresholds) is not dict:
        raise ValueError("Threshold mapping required")
    def validate_threshold(value):
        if (not isinstance(value, CategoryThresholdV1)
                or type(value.min_cases) is not int or value.min_cases < 1
                or type(value.min_accuracy) not in (float, int)
                or not 0 <= value.min_accuracy <= 1
                or type(value.max_regressions) is not int or value.max_regressions < 0):
            raise ValueError("Invalid category threshold")
    validate_threshold(default_threshold)
    for value in thresholds.values():
        validate_threshold(value)
    if type(categories) not in (tuple, list) or not categories:
        raise ValueError("Nonempty category cases required")
    mapping = {}
    for item in categories:
        if (not isinstance(item, CategoryCaseV1)
                or type(item.case_id) is not str or not item.case_id
                or type(item.category) is not str or not item.category
                or len(item.category) > 64 or item.case_id in mapping):
            raise ValueError("Invalid or duplicate category assignment")
        mapping[item.case_id] = item.category
    reference = comparison.get("reference_artifact", {}).get("predictions")
    candidate = comparison.get("candidate_artifact", {}).get("predictions")
    if type(reference) is not list or type(candidate) is not list:
        raise ValueError("Missing predictions")
    refs = {item["case_id"]: item for item in reference}
    preds = {item["case_id"]: item for item in candidate}
    if len(refs) != len(reference) or len(preds) != len(candidate) or set(refs) != set(preds) or set(refs) != set(mapping):
        raise ValueError("Category IDs must match all predictions")
    regressions = set(comparison.get("regressions", []))
    grouped = {}
    for case_id, category in mapping.items():
        expected, actual = refs[case_id], preds[case_id]
        correct = (expected["status"], expected["output"]) == (actual["status"], actual["output"])
        group = grouped.setdefault(category, {"count": 0, "correct": 0, "regressions": 0})
        group["count"] += 1
        group["correct"] += int(correct)
        group["regressions"] += int(case_id in regressions)
    reports = {}
    for category, group in sorted(grouped.items()):
        limit = thresholds.get(category, default_threshold)
        accuracy = group["correct"] / group["count"]
        checks = {
            "minimum_cases": group["count"] >= limit.min_cases,
            "minimum_accuracy": accuracy >= limit.min_accuracy,
            "maximum_regressions": group["regressions"] <= limit.max_regressions,
        }
        reports[category] = {**group, "accuracy": accuracy, "checks": checks, "passed": all(checks.values())}
    return {
        "contract": "future-xsus-core.proofreading-category-quality.v1",
        "categories": reports, "passed": bool(reports) and all(x["passed"] for x in reports.values()),
        "release_authorized": False,
        "category_labels_authenticated": False,
        "general_language_accuracy_verified": False,
    }
