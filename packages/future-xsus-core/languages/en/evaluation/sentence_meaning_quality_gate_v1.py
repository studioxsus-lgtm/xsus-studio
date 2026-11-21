"""Bounded Phase 2 diagnostic gate with independent dataset arithmetic."""
import json

from languages.en.evaluation.sentence_meaning_benchmark_v1 import (
    DEFAULT, evaluate_sentence_frames,
)
from pathlib import Path

CHALLENGE = Path(__file__).with_name("sentence_meaning_challenge_v1.jsonl")


def phase2_quality_report() -> dict:
    base = evaluate_sentence_frames(DEFAULT)
    challenge = evaluate_sentence_frames(CHALLENGE)
    checks = {
        "baseline_case_count": base["cases"] >= 32,
        "baseline_exact_frames": base["correct_frames"] == base["labeled_cases"],
        "baseline_zero_wrong": base["wrong_frames"] == 0,
        "baseline_zero_false_resolutions": base["false_resolutions"] == 0,
        "baseline_expected_abstentions": base["true_abstentions"] == base["expected_abstentions"],
        "challenge_case_count": challenge["cases"] >= 24,
        "challenge_exact_frames": challenge["correct_frames"] == challenge["labeled_cases"],
        "challenge_zero_wrong": challenge["wrong_frames"] == 0,
        "challenge_zero_false_resolutions": challenge["false_resolutions"] == 0,
        "challenge_expected_abstentions": challenge["true_abstentions"] == challenge["expected_abstentions"],
        "count_integrity": all(
            report["cases"] == report["labeled_cases"] + report["expected_abstentions"]
            and report["labeled_cases"] == report["correct_frames"] + report["wrong_frames"] + report["missed_frames"]
            and report["expected_abstentions"] == report["true_abstentions"] + report["false_resolutions"]
            for report in (base, challenge)
        ),
        "privacy": not base["raw_text_exposed"] and not challenge["raw_text_exposed"],
    }
    return {
        "contract": "future-xsus-core.sentence-phase2-quality.v1",
        "passed": all(checks.values()),
        "checks": checks,
        "baseline": {k: v for k, v in base.items() if k not in {"contract"}},
        "challenge": {k: v for k, v in challenge.items() if k not in {"contract"}},
        "production_authorized": False,
        "independent_external_holdout_proven": False,
        "open_domain_understanding_proven": False,
    }


if __name__ == "__main__":
    result = phase2_quality_report()
    print(json.dumps(result, indent=2, sort_keys=True))
    if not result["passed"]:
        raise SystemExit(1)
