"""Generated diagnostic across 3000 distinct controlled grammar patterns."""
import json

from languages.en.text.understanding.expanded_english_v1 import SUBJECTS, VERBS, NOUNS, _SINGULAR
from languages.en.text.understanding.grammar_patterns_v1 import analyze_grammar_pattern


def evaluate_grammar_patterns() -> dict:
    cases = []
    for i in range(3000):
        subject = SUBJECTS[(i // 40) % len(SUBJECTS)]
        verb = VERBS[i % len(VERBS)]
        noun = NOUNS[(i // 600 + i // 40) % len(NOUNS)]
        if i % 3 == 0:
            sentence = f"{subject} can {verb} the {noun}."
            expected_kind, expected_tense = "declarative", "modal"
        elif i % 3 == 1:
            aux = "does" if subject in _SINGULAR else "do"
            sentence = f"{aux} {subject} {verb} the {noun}?"
            expected_kind, expected_tense = "yes_no_question", "present_simple"
        else:
            sentence = f"{subject} should not {verb} the {noun}."
            expected_kind, expected_tense = "declarative", "modal"
        cases.append((sentence, expected_kind, expected_tense))
    resolved = 0
    for sentence, kind, tense in cases:
        frame = analyze_grammar_pattern(sentence)
        resolved += frame.status == "resolved" and frame.kind == kind and frame.tense == tense
    return {
        "contract": "future-xsus-core.grammar-patterns-benchmark.v1",
        "cases": len(cases), "unique_cases": len({item[0] for item in cases}),
        "resolved_correctly": resolved,
        "passed": len(cases) == len({item[0] for item in cases}) == resolved == 3000,
        "independent_external_holdout_proven": False,
        "complete_english_grammar_proven": False,
        "production_authorized": False,
    }


if __name__ == "__main__":
    result = evaluate_grammar_patterns()
    print(json.dumps(result, indent=2, sort_keys=True))
    if not result["passed"]:
        raise SystemExit(1)
