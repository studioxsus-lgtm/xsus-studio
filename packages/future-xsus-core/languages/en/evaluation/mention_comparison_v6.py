"""Compare legacy cue detection against experimental mention-aware filtering.

This benchmark evaluates hand-labeled surface signals, not semantics.
"""
from dataclasses import dataclass
from ..text.discourse_v6 import analyze_discourse_v6
from ..text.reference_signals_v6 import analyze_reference_signals_v6
from ..text.mention_aware_signals_v6 import analyze_mention_aware_v6


@dataclass(frozen=True, slots=True)
class MentionCaseV6:
    name: str
    text: str
    contrast: bool
    reference: bool


MENTION_CASES_V6 = (
    MentionCaseV6("contrast_mention", "The word however appears in a sentence.", False, False),
    MentionCaseV6("reference_mention", "The word she appears in a sentence.", False, False),
    MentionCaseV6("real_contrast", "However, costs rose.", True, False),
    MentionCaseV6("real_reference", "Alex arrived. She waved.", False, True),
    MentionCaseV6("mixed_contrast", "The word however is common. However, costs rose.", True, False),
    MentionCaseV6("mixed_reference", "The word she is common. She waved.", False, True),
    MentionCaseV6("plain", "The report arrived.", False, False),
)


def _scores(predictions, cases, field):
    tp = tn = fp = fn = 0
    for prediction, case in zip(predictions, cases):
        actual = prediction[field]
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


def compare_mention_filter_v6(cases=MENTION_CASES_V6) -> dict:
    cases = tuple(cases)
    if not cases or any(type(case) is not MentionCaseV6 for case in cases):
        raise ValueError("nonempty MentionCaseV6 collection required")
    names = [case.name for case in cases]
    if any(not isinstance(name, str) or not name for name in names) or len(set(names)) != len(names):
        raise ValueError("case names must be nonempty and unique")
    for case in cases:
        if type(case.contrast) is not bool or type(case.reference) is not bool:
            raise ValueError("labels must be boolean")
    before, after = [], []
    for case in cases:
        discourse = analyze_discourse_v6(case.text)
        references = analyze_reference_signals_v6(case.text)
        filtered = analyze_mention_aware_v6(case.text)
        before.append({
            "contrast": any(label == "contrast" for _, label, _ in discourse.explicit_cues),
            "reference": bool(references.references),
        })
        after.append({"contrast": filtered.contrast, "reference": filtered.reference})
    scores_before = {field: _scores(before, cases, field) for field in ("contrast", "reference")}
    scores_after = {field: _scores(after, cases, field) for field in ("contrast", "reference")}
    return {
        "contract": "future-xsus-core.v6.mention-comparison",
        "cases": len(cases),
        "before": scores_before,
        "after": scores_after,
        "false_positive_reduction": {
            field: scores_before[field]["fp"] - scores_after[field]["fp"]
            for field in ("contrast", "reference")
        },
        "new_false_negatives": {
            field: scores_after[field]["fn"] - scores_before[field]["fn"]
            for field in ("contrast", "reference")
        },
        "representative_accuracy_claim": False,
        "production_filter_enabled": False,
    }
