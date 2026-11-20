"""Four-way surface cue comparison with per-case regression records."""
from .mention_stress_v6 import STRESS_CASES_V6, StressCaseV6
from ..text.discourse_v6 import analyze_discourse_v6
from ..text.reference_signals_v6 import analyze_reference_signals_v6
from ..text.mention_aware_signals_v6 import analyze_mention_aware_v6
from ..text.quotation_filter_v6 import analyze_quotation_filter_v6
from ..text.indirect_mention_filter_v6 import analyze_indirect_mention_v6

FIELDS = ("contrast", "reference")
METHODS = ("baseline", "mention", "quotation", "indirect")


def _metrics(predictions, cases, field):
    tp = tn = fp = fn = 0
    for predicted, case in zip(predictions, cases):
        actual = predicted[field]
        expected = getattr(case, field)
        if actual and expected:
            tp += 1
        elif not actual and not expected:
            tn += 1
        elif actual:
            fp += 1
        else:
            fn += 1
    return {"tp": tp, "tn": tn, "fp": fp, "fn": fn,
            "precision": tp / (tp + fp) if tp + fp else None,
            "recall": tp / (tp + fn) if tp + fn else None}


def compare_four_filters_v6(cases=STRESS_CASES_V6):
    cases = tuple(cases)
    if not cases or any(type(case) is not StressCaseV6 for case in cases):
        raise ValueError("nonempty StressCaseV6 collection required")
    names = [case.name for case in cases]
    if any(not isinstance(name, str) or not name for name in names) or len(set(names)) != len(names):
        raise ValueError("case names must be nonempty and unique")
    if any(type(case.contrast) is not bool or type(case.reference) is not bool
           or not isinstance(case.category, str) or not case.category for case in cases):
        raise ValueError("invalid labels or category")
    predictions = {method: [] for method in METHODS}
    for case in cases:
        discourse = analyze_discourse_v6(case.text)
        reference = analyze_reference_signals_v6(case.text)
        mention = analyze_mention_aware_v6(case.text)
        quotation = analyze_quotation_filter_v6(case.text)
        indirect = analyze_indirect_mention_v6(case.text)
        predictions["baseline"].append({
            "contrast": any(label == "contrast" for _, label, _ in discourse.explicit_cues),
            "reference": bool(reference.references)})
        for method, result in (("mention", mention), ("quotation", quotation), ("indirect", indirect)):
            predictions[method].append({"contrast": result.contrast, "reference": result.reference})
    metrics = {method: {field: _metrics(rows, cases, field) for field in FIELDS}
               for method, rows in predictions.items()}
    transitions = []
    for old, new in zip(METHODS, METHODS[1:]):
        regressions, corrections = [], []
        for i, case in enumerate(cases):
            for field in FIELDS:
                expected = getattr(case, field)
                was_correct = predictions[old][i][field] == expected
                now_correct = predictions[new][i][field] == expected
                record = {"case": case.name, "category": case.category, "field": field}
                if was_correct and not now_correct:
                    regressions.append(record)
                elif not was_correct and now_correct:
                    corrections.append(record)
        transitions.append({"from": old, "to": new, "regressions": regressions,
                            "corrections": corrections,
                            "false_positive_reduction": {
                                field: metrics[old][field]["fp"] - metrics[new][field]["fp"]
                                for field in FIELDS},
                            "new_false_negatives": {
                                field: metrics[new][field]["fn"] - metrics[old][field]["fn"]
                                for field in FIELDS}})
    return {"contract": "future-xsus-core.v6.four-way-comparison",
            "cases": len(cases), "metrics": metrics, "transitions": transitions,
            "representative_accuracy_claim": False, "production_filter_enabled": False}
