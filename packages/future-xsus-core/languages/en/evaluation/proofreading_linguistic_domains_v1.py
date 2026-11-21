"""Fail-closed linguistic-domain aggregation of authenticated category quality."""
from dataclasses import dataclass

_DOMAINS = frozenset(("grammar", "morphology", "syntax", "preservation"))


@dataclass(frozen=True, slots=True)
class LinguisticDomainAssignmentV1:
    category: str
    domain: str


@dataclass(frozen=True, slots=True)
class LinguisticDomainThresholdV1:
    min_cases: int = 2
    min_accuracy: float = 0.8
    max_regressions: int = 0


def evaluate_proofreading_linguistic_domains_v1(
    unified_report, assignments, *,
    thresholds=None, default_threshold=LinguisticDomainThresholdV1(),
):
    if (type(unified_report) is not dict
            or unified_report.get("contract") != "future-xsus-core.proofreading-unified-quality.v1"
            or unified_report.get("artifacts_authenticated_at_check") is not True
            or unified_report.get("category_manifest_authenticated_at_check") is not True):
        raise ValueError("Authenticated unified quality report required")
    categories = unified_report.get("categories")
    if type(categories) is not dict or not categories:
        raise ValueError("Nonempty category metrics required")
    if type(assignments) not in (tuple, list) or not assignments:
        raise ValueError("Domain assignments required")
    if thresholds is None:
        thresholds = {}
    if type(thresholds) is not dict or any(domain not in _DOMAINS for domain in thresholds):
        raise ValueError("Invalid domain threshold mapping")
    def validate_threshold(value):
        if (not isinstance(value, LinguisticDomainThresholdV1)
                or type(value.min_cases) is not int or value.min_cases < 1
                or type(value.min_accuracy) not in (int, float)
                or not 0 <= value.min_accuracy <= 1
                or type(value.max_regressions) is not int or value.max_regressions < 0):
            raise ValueError("Invalid domain threshold")
    validate_threshold(default_threshold)
    for value in thresholds.values():
        validate_threshold(value)
    mapping = {}
    for item in assignments:
        if (not isinstance(item, LinguisticDomainAssignmentV1)
                or type(item.category) is not str or not item.category
                or item.category in mapping or item.domain not in _DOMAINS):
            raise ValueError("Invalid or duplicate domain assignment")
        mapping[item.category] = item.domain
    if set(mapping) != set(categories):
        raise ValueError("All categories must have exactly one domain")
    grouped = {}
    for category, domain in mapping.items():
        item = categories[category]
        if (type(item) is not dict or type(item.get("count")) is not int
                or type(item.get("correct")) is not int
                or type(item.get("regressions")) is not int
                or not 0 <= item["correct"] <= item["count"]
                or not 0 <= item["regressions"] <= item["count"]
                or item["count"] < 1 or item.get("passed") is not True):
            raise ValueError("Invalid or failing category metrics")
        group = grouped.setdefault(domain, {"count": 0, "correct": 0, "regressions": 0})
        for key in group:
            group[key] += item[key]
    results = {}
    for domain, group in sorted(grouped.items()):
        limit = thresholds.get(domain, default_threshold)
        accuracy = group["correct"] / group["count"]
        checks = {
            "minimum_cases": group["count"] >= limit.min_cases,
            "minimum_accuracy": accuracy >= limit.min_accuracy,
            "maximum_regressions": group["regressions"] <= limit.max_regressions,
        }
        results[domain] = {**group, "accuracy": accuracy, "checks": checks, "passed": all(checks.values())}
    return {
        "contract": "future-xsus-core.proofreading-linguistic-domains.v1",
        "domains": results,
        "passed": unified_report.get("passed") is True and all(r["passed"] for r in results.values()),
        "all_domains_covered": set(results) == _DOMAINS,
        "domain_assignments_authenticated": False,
        "independent_language_competence_proven": False,
        "release_authorized": False,
    }
