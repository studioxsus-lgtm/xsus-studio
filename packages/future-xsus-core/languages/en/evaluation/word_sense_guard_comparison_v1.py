"""Compare baseline and opt-in guarded lexical decisions on both datasets.

Comparison is diagnostic, not a release gate or proof of understanding.
"""
import json
from pathlib import Path

from languages.en.text.understanding.context_guard_v1 import analyze_guarded_word_sense
from languages.en.text.understanding.word_sense_v1 import analyze_word_sense
from languages.en.evaluation.word_sense_benchmark_v1 import _DEFAULT
from languages.en.evaluation.word_sense_challenge_report_v1 import CHALLENGE


def compare_dataset(path: Path) -> dict:
    counts = {
        "cases": 0, "baseline_correct": 0, "guarded_correct": 0,
        "baseline_wrong": 0, "guarded_wrong": 0,
        "baseline_false_resolutions": 0, "guarded_false_resolutions": 0,
        "baseline_true_abstentions": 0, "guarded_true_abstentions": 0,
        "guard_triggered": 0, "correct_to_abstention": 0,
        "wrong_to_abstention": 0, "false_resolution_to_abstention": 0,
    }
    for line in path.read_text(encoding="utf-8").splitlines():
        row = json.loads(line)
        expected = row["expected_sense"]
        base = analyze_word_sense(row["text"], row["target"])
        guarded = analyze_guarded_word_sense(row["text"], row["target"])
        counts["cases"] += 1
        for prefix, result in (("baseline", base), ("guarded", guarded)):
            if expected is None and result.sense is None:
                counts[f"{prefix}_true_abstentions"] += 1
            elif expected is None and result.sense is not None:
                counts[f"{prefix}_false_resolutions"] += 1
            elif result.sense == expected:
                counts[f"{prefix}_correct"] += 1
            elif result.sense is not None:
                counts[f"{prefix}_wrong"] += 1
        if guarded.guard_triggered:
            counts["guard_triggered"] += 1
            if base.sense == expected and expected is not None:
                counts["correct_to_abstention"] += 1
            elif expected is None and base.sense is not None:
                counts["false_resolution_to_abstention"] += 1
            elif base.sense is not None and base.sense != expected:
                counts["wrong_to_abstention"] += 1
    return counts


def compare_all() -> dict:
    return {
        "contract": "future-xsus-core.word-sense-guard-comparison.v1",
        "baseline": compare_dataset(_DEFAULT),
        "challenge": compare_dataset(CHALLENGE),
        "production_authorized": False,
        "external_holdout_proven": False,
        "raw_text_exposed": False,
    }


if __name__ == "__main__":
    print(json.dumps(compare_all(), indent=2, sort_keys=True))
