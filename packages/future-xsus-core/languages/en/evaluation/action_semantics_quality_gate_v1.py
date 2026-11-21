"""Phase 3.2 bounded action semantics engineering gate."""
import json

from languages.en.evaluation.action_semantics_benchmark_v1 import evaluate_action_semantics


def evaluate_action_quality_gate() -> dict:
    result = evaluate_action_semantics()
    checks = {
        "minimum_authored_cases": result["cases"] >= 32,
        "labeled_case_coverage": result["labeled_cases"] >= 22,
        "abstention_case_coverage": result["expected_abstentions"] >= 10,
        "zero_wrong": result["wrong"] == 0,
        "zero_missed": result["missed"] == 0,
        "zero_false_resolutions": result["false_resolutions"] == 0,
        "all_labeled_correct": result["correct"] == result["labeled_cases"],
        "all_abstentions_correct": result["true_abstentions"] == result["expected_abstentions"],
        "count_integrity": (
            result["cases"] == result["labeled_cases"] + result["expected_abstentions"]
            and result["labeled_cases"] == result["correct"] + result["wrong"] + result["missed"]
            and result["expected_abstentions"] == result["true_abstentions"] + result["false_resolutions"]
        ),
        "no_raw_text": not result["raw_text_exposed"],
        "not_production_authorized": not result["production_authorized"],
    }
    return {
        "contract": "future-xsus-core.action-semantics-quality.v1",
        "passed": all(checks.values()),
        "checks": checks,
        "cases": result["cases"],
        "production_authorized": False,
        "open_domain_semantics_proven": False,
        "independent_external_holdout_proven": False,
    }


if __name__ == "__main__":
    result = evaluate_action_quality_gate()
    print(json.dumps(result, indent=2, sort_keys=True))
    if not result["passed"]:
        raise SystemExit(1)
