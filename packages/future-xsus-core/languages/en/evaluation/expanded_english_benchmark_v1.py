"""Deterministic 1000-distinct-combination grammar benchmark, not a blind holdout."""
import json
from languages.en.text.understanding.expanded_english_v1 import (
    SUBJECTS, VERBS, NOUNS, analyze_expanded_english,
)


def evaluate_expanded_english() -> dict:
    # 15 * 40 * 50 = 30000 distinct positive controlled SVO combinations.
    # Sample 1000 distinct combinations across subjects, verbs and nouns.
    cases = [
        (SUBJECTS[(i // 40) % len(SUBJECTS)],
         VERBS[i % len(VERBS)],
         NOUNS[(i * 7 + i // 40) % len(NOUNS)])
        for i in range(1000)
    ]
    # Explicitly verify uniqueness; no repeated input counts as a new example.
    cases = list(dict.fromkeys(cases))
    resolved = 0
    for subject, verb, noun in cases:
        frame = analyze_expanded_english(f"{subject} do not {verb} the {noun}."
            if subject in {"i", "you", "we", "they"}
            else f"{subject} does not {verb} the {noun}.")
        resolved += (frame.status == "resolved" and frame.action == verb
                     and frame.subject == subject and frame.object == f"the {noun}"
                     and frame.polarity == "negative")
    return {
        "contract": "future-xsus-core.expanded-english-benchmark.v1",
        "cases": len(cases), "resolved_correctly": resolved,
        "passed": len(cases) == 1000 and resolved == 1000,
        "verb_lemmas": len(VERBS), "noun_heads": len(NOUNS),
        "subjects": len(SUBJECTS),
        "theoretical_positive_combinations": len(SUBJECTS) * len(VERBS) * len(NOUNS),
        "independent_external_holdout_proven": False,
        "production_authorized": False,
    }


if __name__ == "__main__":
    result = evaluate_expanded_english()
    print(json.dumps(result, indent=2, sort_keys=True))
    if not result["passed"]:
        raise SystemExit(1)
