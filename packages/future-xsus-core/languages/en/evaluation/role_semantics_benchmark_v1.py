"""Phase 3.3 deterministic authored structural role diagnostic."""
import json

from languages.en.text.understanding.role_semantics_v1 import classify_sentence_roles
from languages.en.text.understanding.role_relations_v1 import compare_sentence_roles


def evaluate_role_semantics() -> dict:
    singles = [
        ("She reads the report.", "third_person_pronoun", "definite_object"),
        ("He reviews the document.", "third_person_pronoun", "definite_object"),
        ("I read the report.", "first_person_pronoun", "definite_object"),
        ("We test the model.", "first_person_pronoun", "definite_object"),
        ("You read the report.", "second_person_pronoun", "definite_object"),
        ("The developer creates a project.", "explicit_nominal", "indefinite_object"),
        ("The user opens the file.", "explicit_nominal", "definite_object"),
        ("The system deletes the project.", "explicit_nominal", "definite_object"),
        ("She does not read the report.", "third_person_pronoun", "definite_object"),
        ("She reads private records.", None, None),
        ("Does she read the report?", None, None),
        ("She reads the report and writes the file.", None, None),
    ]
    pairs = [
        ("She reads the report.", "She reads the report.", "same_explicit_roles"),
        ("She reads the report.", "She does not read the report.", "same_roles_opposite_polarity"),
        ("She reads the report.", "He reads the report.", "different_subject"),
        ("She reads the report.", "She writes the report.", "different_action"),
        ("She reads the report.", "She reads the document.", "different_object"),
        ("She reads private records.", "She reads the report.", None),
    ]
    failures = 0
    for sentence, subject_kind, object_kind in singles:
        result = classify_sentence_roles(sentence)
        if subject_kind is None:
            if result.status != "abstained":
                failures += 1
        elif (result.status != "resolved" or result.subject_kind != subject_kind
              or result.object_kind != object_kind):
            failures += 1
    for left, right, expected in pairs:
        result = compare_sentence_roles(left, right)
        if expected is None:
            if result.status != "abstained":
                failures += 1
        elif result.status != "resolved" or result.relation != expected:
            failures += 1
    return {
        "contract": "future-xsus-core.role-semantics-benchmark.v1",
        "single_cases": len(singles),
        "pair_cases": len(pairs),
        "cases": len(singles) + len(pairs),
        "failures": failures,
        "passed": failures == 0,
        "raw_text_exposed": False,
        "independent_external_holdout_proven": False,
        "production_authorized": False,
    }


if __name__ == "__main__":
    result = evaluate_role_semantics()
    print(json.dumps(result, indent=2, sort_keys=True))
    if not result["passed"]:
        raise SystemExit(1)
