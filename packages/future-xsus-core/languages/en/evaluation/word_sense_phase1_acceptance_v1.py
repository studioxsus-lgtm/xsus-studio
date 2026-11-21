"""Phase 1 bounded lexical milestone acceptance, NOT production authorization.

Accepts the completed experimental lexical milestone only when baseline
quality, challenge visibility, guard comparison and arithmetic are verified.
Adversarial challenge is intentionally not required to have zero errors.
"""
import json

from languages.en.evaluation.word_sense_benchmark_v1 import evaluate_word_sense
from languages.en.evaluation.word_sense_quality_gate_v1 import check_word_sense_quality
from languages.en.evaluation.word_sense_challenge_report_v1 import evaluate_challenge
from languages.en.evaluation.word_sense_guard_comparison_v1 import compare_all
from languages.en.text.understanding.word_sense_v1 import supported_words


def phase1_acceptance() -> dict:
    baseline = evaluate_word_sense()
    gate = check_word_sense_quality(baseline)
    challenge = evaluate_challenge()
    comparison = compare_all()
    words = supported_words()
    checks = {
        "lexical_targets_at_least_14": len(words) >= 14,
        "baseline_has_at_least_63_cases": baseline["cases"] >= 63,
        "baseline_has_all_supported_targets": set(baseline["per_target"]) == set(words),
        "baseline_diagnostic_gate_passed": gate["passed"],
        "challenge_has_at_least_48_cases": challenge["cases"] >= 48,
        "challenge_has_all_supported_targets": set(challenge["per_target"]) == set(words),
        "challenge_counts_consistent": (
            challenge["cases"] == challenge["correct_senses"] +
            challenge["wrong_senses"] + challenge["missed_senses"] +
            challenge["true_abstentions"] + challenge["false_resolutions"]
        ),
        "comparison_covers_both_datasets": (
            comparison["baseline"]["cases"] == baseline["cases"] and
            comparison["challenge"]["cases"] == challenge["cases"]
        ),
        "guard_does_not_increase_resolved_errors_on_baseline": (
            comparison["baseline"]["guarded_wrong"] <= comparison["baseline"]["baseline_wrong"] and
            comparison["baseline"]["guarded_false_resolutions"] <=
            comparison["baseline"]["baseline_false_resolutions"]
        ),
        "privacy_and_nonproduction_flags": (
            not baseline["raw_text_exposed"] and
            not challenge["raw_text_exposed"] and
            not comparison["raw_text_exposed"] and
            not gate["production_authorized"]
        ),
    }
    return {
        "contract": "future-xsus-core.word-sense-phase1-acceptance.v1",
        "phase": "1-lexical-word-sense",
        "status": "experimental_milestone_complete" if all(checks.values()) else "incomplete",
        "passed": all(checks.values()),
        "checks": checks,
        "supported_targets": len(words),
        "baseline_cases": baseline["cases"],
        "challenge_cases": challenge["cases"],
        "challenge_correct": challenge["correct_senses"],
        "challenge_wrong": challenge["wrong_senses"],
        "challenge_missed": challenge["missed_senses"],
        "challenge_false_resolutions": challenge["false_resolutions"],
        "guard_challenge_correct_to_abstention": comparison["challenge"]["correct_to_abstention"],
        "guard_challenge_wrong_to_abstention": comparison["challenge"]["wrong_to_abstention"],
        "guard_challenge_false_resolution_to_abstention": comparison["challenge"]["false_resolution_to_abstention"],
        "production_authorized": False,
        "independent_external_holdout_proven": False,
        "open_domain_understanding_proven": False,
        "raw_text_exposed": False,
    }


if __name__ == "__main__":
    report = phase1_acceptance()
    print(json.dumps(report, indent=2, sort_keys=True))
    if not report["passed"]:
        raise SystemExit(1)
