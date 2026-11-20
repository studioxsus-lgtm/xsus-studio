"""Adversarial mention-filter evaluation with explicit residual error reports.

Hand-labeled examples; not a representative sample of English.
"""
from dataclasses import dataclass
from ..text.mention_aware_signals_v6 import analyze_mention_aware_v6


@dataclass(frozen=True, slots=True)
class StressCaseV6:
    name: str
    text: str
    contrast: bool
    reference: bool
    category: str


STRESS_CASES_V6 = (
    StressCaseV6("plain", "The report arrived.", False, False, "control"),
    StressCaseV6("literal_contrast", "The word however appears in a sentence.", False, False, "mention"),
    StressCaseV6("literal_reference", "The word she appears in a sentence.", False, False, "mention"),
    StressCaseV6("real_contrast", "However, costs rose.", True, False, "usage"),
    StressCaseV6("real_reference", "Alex arrived. She waved.", False, True, "usage"),
    StressCaseV6("mixed_contrast", "The word however is common. However, costs rose.", True, False, "mixed"),
    StressCaseV6("mixed_reference", "The word she is common. She waved.", False, True, "mixed"),
    StressCaseV6("quoted_contrast", 'He wrote "however" on the board.', False, False, "quotation"),
    StressCaseV6("quoted_reference", 'The sign reads "she".', False, False, "quotation"),
    StressCaseV6("other_mention", "A teacher mentioned however in class.", False, False, "paraphrase"),
    StressCaseV6("contrast_and_reference", "However, she waited.", True, True, "usage"),
    StressCaseV6("literal_and_usage", "The word she is common. However, she waited.", True, True, "mixed"),
)


def evaluate_mention_stress_v6(cases=STRESS_CASES_V6) -> dict:
    cases = tuple(cases)
    if not cases or any(type(case) is not StressCaseV6 for case in cases):
        raise ValueError("nonempty StressCaseV6 collection required")
    names = [case.name for case in cases]
    if any(not isinstance(name, str) or not name for name in names) or len(set(names)) != len(names):
        raise ValueError("case names must be nonempty and unique")
    if any(type(case.contrast) is not bool or type(case.reference) is not bool
           or not isinstance(case.category, str) or not case.category for case in cases):
        raise ValueError("invalid expected label or category")
    failures = []
    by_category = {}
    for case in cases:
        actual = analyze_mention_aware_v6(case.text)
        row = by_category.setdefault(case.category, {"cases": 0, "correct_fields": 0, "total_fields": 0})
        row["cases"] += 1
        for field in ("contrast", "reference"):
            row["total_fields"] += 1
            expected = getattr(case, field)
            observed = getattr(actual, field)
            if expected == observed:
                row["correct_fields"] += 1
            else:
                failures.append({"case": case.name, "category": case.category,
                                 "field": field, "expected": expected, "actual": observed})
    return {
        "contract": "future-xsus-core.v6.mention-stress",
        "cases": len(cases),
        "field_accuracy": sum(row["correct_fields"] for row in by_category.values()) / (2 * len(cases)),
        "by_category": {
            category: {**row, "accuracy": row["correct_fields"] / row["total_fields"]}
            for category, row in by_category.items()
        },
        "failures": failures,
        "represents_general_english": False,
        "production_ready": False,
    }
