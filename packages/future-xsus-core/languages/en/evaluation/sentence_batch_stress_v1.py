"""Deterministic bounded Phase 2 batch stress and contract diagnostic."""
import json

from languages.en.text.understanding.sentence_batch_v1 import (
    MAX_SENTENCES, analyze_sentence_batch, compare_sentence_batch_pairs,
)

POSITIVE = "She reads the report."
NEGATIVE = "She does not read the report."
UNSUPPORTED = "She reads private records."


def evaluate_batch_stress(iterations: int = 100) -> dict:
    if type(iterations) is not int or not 1 <= iterations <= 1000:
        raise ValueError("iterations must be between 1 and 1000")
    failures = 0
    for _ in range(iterations):
        sentences = [POSITIVE] * 16 + [NEGATIVE] * 8 + [UNSUPPORTED] * 8
        result = analyze_sentence_batch(sentences)
        expected = {"total": MAX_SENTENCES, "resolved": 24, "abstained": 8,
                    "positive": 16, "negative": 8}
        if result["summary"] != expected or len(result["items"]) != MAX_SENTENCES:
            failures += 1
        comparisons = compare_sentence_batch_pairs(sentences, [(0, 16), (0, 24), (0, 1)])
        if (comparisons["resolved"] != 2 or comparisons["abstained"] != 1
                or comparisons["relations"][0]["relation"] != "opposite_explicit_polarity"
                or comparisons["relations"][1]["relation"] is not None
                or comparisons["relations"][2]["relation"] != "same_explicit_frame"):
            failures += 1
    return {
        "contract": "future-xsus-core.sentence-batch-stress.v1",
        "iterations": iterations,
        "batch_evaluations": iterations,
        "relation_evaluations": iterations,
        "failures": failures,
        "passed": failures == 0,
        "raw_text_exposed": False,
        "production_authorized": False,
        "performance_benchmark_proven": False,
    }


if __name__ == "__main__":
    result = evaluate_batch_stress()
    print(json.dumps(result, indent=2, sort_keys=True))
    if not result["passed"]:
        raise SystemExit(1)
