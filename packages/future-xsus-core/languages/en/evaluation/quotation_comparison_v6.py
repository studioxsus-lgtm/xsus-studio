"""Three-way evaluation of baseline, mention-aware, quotation-aware cues."""
from .mention_stress_v6 import STRESS_CASES_V6, StressCaseV6
from ..text.discourse_v6 import analyze_discourse_v6
from ..text.reference_signals_v6 import analyze_reference_signals_v6
from ..text.mention_aware_signals_v6 import analyze_mention_aware_v6
from ..text.quotation_filter_v6 import analyze_quotation_filter_v6

FIELDS = ("contrast", "reference")


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
    return {
        "tp": tp, "tn": tn, "fp": fp, "fn": fn,
        "precision": tp / (tp + fp) if tp + fp else None,
        "recall": tp / (tp + fn) if tp + fn else None,
    }


def compare_quotation_filters_v6(cases=STRESS_CASES_V6) -> dict:
    cases = tuple(cases)
    if not cases or any(type(case) is not StressCaseV6 for case in cases):
        raise ValueError("nonempty StressCaseV6 collection required")
    names = [case.name for case in cases]
    if any(not isinstance(name, str) or not name for name in names) or len(set(names)) != len(names):
        raise ValueError("case names must be nonempty and unique")
    if any(type(case.contrast) is not bool or type(case.reference) is not bool for case in cases):
        raise ValueError("labels must be boolean")
    predictions = {"baseline": [], "mention": [], "quotation": []}
    for case in cases:
        discourse = analyze_discourse_v6(case.text)
        references = analyze_reference_signals_v6(case.text)
        mention = analyze_mention_aware_v6(case.text)
        quotation = analyze_quotation_filter_v6(case.text)
        predictions["baseline"].append({
            "contrast": any(label == "contrast" for _, label, _ in discourse.explicit_cues),
            "reference": bool(references.references),
        })
        predictions["mention"].append({"contrast": mention.contrast, "reference": mention.reference})
        predictions["quotation"].append({"contrast": quotation.contrast, "reference": quotation.reference})
    metrics = {
        method: {field: _metrics(rows, cases, field) for field in FIELDS}
        for method, rows in predictions.items()
    }
    regressions = []
    for index, case in enumerate(cases):
        for field in FIELDS:
            before = predictions["mention"][index][field] == getattr(case, field)
            after = predictions["quotation"][index][field] == getattr(case, field)
            if before and not after:
                regressions.append({"case": case.name, "field": field,
                                    "expected": getattr(case, field),
                                    "actual": predictions["quotation"][index][field]})
    return {
        "contract": "future-xsus-core.v6.quotation-comparison",
        "cases": len(cases),
        "metrics": metrics,
        "mention_to_quotation_fp_reduction": {
            field: metrics["mention"][field]["fp"] - metrics["quotation"][field]["fp"]
            for field in FIELDS
        },
        "mention_to_quotation_fn_change": {
            field: metrics["quotation"][field]["fn"] - metrics["mention"][field]["fn"]
            for field in FIELDS
        },
        "regressions": regressions,
        "representative_accuracy_claim": False,
        "production_filter_enabled": False,
    }
