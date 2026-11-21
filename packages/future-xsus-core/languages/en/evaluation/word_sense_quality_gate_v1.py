"""Conservative, read-only quality gate for the lexical holdout.

A passing gate is a narrow diagnostic, never authorization for production.
"""
import argparse
import json
from pathlib import Path

from languages.en.evaluation.word_sense_benchmark_v1 import evaluate_word_sense


def check_word_sense_quality(report: dict, *, min_labeled_accuracy: float = 0.90,
                             min_coverage: float = 0.70) -> dict:
    if not isinstance(report, dict) or report.get("contract") != "future-xsus-core.word-sense-benchmark.v1":
        raise ValueError("invalid word-sense benchmark contract")
    for name, value in (("min_labeled_accuracy", min_labeled_accuracy), ("min_coverage", min_coverage)):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not 0 <= value <= 1:
            raise ValueError(f"{name} must be a number between 0 and 1")
    cases = report.get("cases")
    labeled = report.get("labeled_cases")
    expected_abstentions = report.get("expected_abstentions")
    correct = report.get("correct_senses")
    wrong = report.get("wrong_senses")
    missed = report.get("missed_senses")
    true_abstentions = report.get("true_abstentions")
    false_resolutions = report.get("false_resolutions")
    resolved = report.get("resolved_cases")
    counts = (cases, labeled, expected_abstentions, correct, wrong, missed,
              true_abstentions, false_resolutions, resolved)
    if any(type(value) is not int or value < 0 for value in counts):
        raise ValueError("invalid benchmark counts")
    if (cases == 0 or labeled == 0 or expected_abstentions == 0
            or cases != labeled + expected_abstentions
            or labeled != correct + wrong + missed
            or expected_abstentions != true_abstentions + false_resolutions
            or resolved != correct + wrong + false_resolutions):
        raise ValueError("inconsistent benchmark counts")
    accuracy = correct / labeled
    coverage = resolved / cases
    passed = (accuracy >= min_labeled_accuracy and coverage >= min_coverage
              and wrong == 0 and false_resolutions == 0)
    return {
        "contract": "future-xsus-core.word-sense-quality-gate.v1",
        "passed": passed,
        "labeled_accuracy": round(accuracy, 6),
        "coverage": round(coverage, 6),
        "wrong_senses": wrong,
        "false_resolutions": false_resolutions,
        "minimum_labeled_accuracy": min_labeled_accuracy,
        "minimum_coverage": min_coverage,
        "production_authorized": False,
        "open_domain_understanding_proven": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evaluation", type=Path)
    args = parser.parse_args()
    report = evaluate_word_sense(args.evaluation) if args.evaluation else evaluate_word_sense()
    result = check_word_sense_quality(report)
    print(json.dumps(result, indent=2, sort_keys=True))
    if not result["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
