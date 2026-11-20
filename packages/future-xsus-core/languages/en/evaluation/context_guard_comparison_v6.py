"""Independent five-method comparison; keeps existing four-way contract unchanged."""
from .adversarial_matrix_v6 import ADVERSARIAL_MATRIX_V6
from .mention_stress_v6 import StressCaseV6
from .four_way_comparison_v6 import compare_four_filters_v6, FIELDS
from ..text.context_guard_filter_v6 import analyze_context_guard_v6


def compare_context_guard_v6(cases=ADVERSARIAL_MATRIX_V6):
    cases = tuple(cases)
    previous = compare_four_filters_v6(cases)
    predictions = []
    for case in cases:
        result = analyze_context_guard_v6(case.text)
        predictions.append({"contrast": result.contrast, "reference": result.reference})
    scores = {}
    regressions = []
    corrections = []
    for field in FIELDS:
        tp = tn = fp = fn = 0
        for case, result in zip(cases, predictions):
            expected = getattr(case, field)
            actual = result[field]
            if expected and actual:
                tp += 1
            elif not expected and not actual:
                tn += 1
            elif actual:
                fp += 1
            else:
                fn += 1
        scores[field] = {"tp": tp, "tn": tn, "fp": fp, "fn": fn,
                         "precision": tp / (tp + fp) if tp + fp else None,
                         "recall": tp / (tp + fn) if tp + fn else None}
    # Compare each case to the previous indirect filter rather than
    # inferring changes from aggregate confusion matrices alone.
    from ..text.indirect_mention_filter_v6 import analyze_indirect_mention_v6
    for case, result in zip(cases, predictions):
        old = analyze_indirect_mention_v6(case.text)
        for field in FIELDS:
            expected = getattr(case, field)
            old_correct = getattr(old, field) == expected
            new_correct = result[field] == expected
            record = {"case": case.name, "category": case.category, "field": field}
            if old_correct and not new_correct:
                regressions.append(record)
            elif not old_correct and new_correct:
                corrections.append(record)
    old_scores = previous["metrics"]["indirect"]
    return {
        "contract": "future-xsus-core.v6.context-guard-comparison",
        "cases": len(cases),
        "metrics": {**previous["metrics"], "context_guard": scores},
        "indirect_to_context_guard": {
            "corrections": corrections,
            "regressions": regressions,
            "false_positive_reduction": {
                field: old_scores[field]["fp"] - scores[field]["fp"] for field in FIELDS
            },
            "new_false_negatives": {
                field: scores[field]["fn"] - old_scores[field]["fn"] for field in FIELDS
            },
        },
        "representative_accuracy_claim": False,
        "production_filter_enabled": False,
    }
