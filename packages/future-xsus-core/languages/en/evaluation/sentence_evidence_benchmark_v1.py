"""Deterministic evidence grouping contract diagnostic."""
import json

from languages.en.text.understanding.sentence_evidence_v1 import analyze_sentence_evidence


def evaluate_sentence_evidence() -> dict:
    cases = [
        (["She reads the report."], (1, 0, 0)),
        (["She reads the report.", "She does not read the report."], (1, 1, 0)),
        (["She reads the report.", "She writes the report."], (2, 0, 0)),
        (["She reads the report.", "She reads private records."], (1, 0, 1)),
        (["The developer builds the application.",
          "The developer does not build the application.",
          "The user opens the file."], (2, 1, 0)),
        (["They test the model.", "They test the project."], (2, 0, 0)),
        (["She reads private records."], (0, 0, 1)),
        (["She reads the report."] * 32, (1, 0, 0)),
    ]
    failures = 0
    for sentences, expected in cases:
        result = analyze_sentence_evidence(sentences)
        observed = (result["group_count"], result["explicit_polarity_conflict_groups"],
                    len(result["abstained_indices"]))
        if observed != expected:
            failures += 1
        if result["world_truth_verified"] or result["production_authorized"]:
            failures += 1
    return {
        "contract": "future-xsus-core.sentence-evidence-benchmark.v1",
        "cases": len(cases),
        "passed_cases": len(cases) - min(failures, len(cases)),
        "failures": failures,
        "passed": failures == 0,
        "raw_text_exposed": False,
        "production_authorized": False,
        "independent_external_holdout_proven": False,
    }


if __name__ == "__main__":
    result = evaluate_sentence_evidence()
    print(json.dumps(result, indent=2, sort_keys=True))
    if not result["passed"]:
        raise SystemExit(1)
