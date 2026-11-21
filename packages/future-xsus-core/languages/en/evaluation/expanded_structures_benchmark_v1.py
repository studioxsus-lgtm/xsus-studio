"""Deterministic 2000-distinct controlled modifier/tense structures."""
import json

from languages.en.text.understanding.expanded_english_v1 import SUBJECTS, VERBS, NOUNS
from languages.en.text.understanding.expanded_structures_v1 import (
    ADJECTIVES, ADVERBS, analyze_structured_clause,
)


def evaluate_expanded_structures() -> dict:
    # Explicitly unique tuples; 2000 varied sentences, not 2000 repeats.
    cases = []
    for i in range(2000):
        subject = SUBJECTS[(i // 40) % len(SUBJECTS)]
        verb = VERBS[i % len(VERBS)]
        noun = NOUNS[(i // 600) % len(NOUNS)]
        adjective = ADJECTIVES[(i // 40 + i // 600) % len(ADJECTIVES)]
        adverb = ADVERBS[(i // 40 + i // 240) % len(ADVERBS)]
        cases.append((subject, verb, noun, adjective, adverb))
    unique = len(set(cases))
    resolved = 0
    for subject, verb, noun, adjective, adverb in cases:
        frame = analyze_structured_clause(
            f"{subject} {adverb} {verb} the {adjective} {noun}.")
        resolved += (frame.status == "resolved" and frame.action == verb
                     and frame.object == noun and frame.adjective == adjective
                     and frame.adverb == adverb and frame.tense == "present_simple")
    return {
        "contract": "future-xsus-core.expanded-structures-benchmark.v1",
        "cases": len(cases), "unique_cases": unique,
        "resolved_correctly": resolved,
        "passed": unique == 2000 and resolved == 2000,
        "adjectives": len(ADJECTIVES), "adverbs": len(ADVERBS),
        "independent_external_holdout_proven": False,
        "production_authorized": False,
    }


if __name__ == "__main__":
    result = evaluate_expanded_structures()
    print(json.dumps(result, indent=2, sort_keys=True))
    if not result["passed"]:
        raise SystemExit(1)
