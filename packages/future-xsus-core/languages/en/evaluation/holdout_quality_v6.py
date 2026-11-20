"""Separate, hand-labeled challenge set for the experimental V6 quality gate.

Not statistically independent or representative of real English usage.
"""
from .mention_stress_v6 import StressCaseV6
from .quality_gate_v6 import QualityThresholdsV6, evaluate_quality_gate_v6

HOLDOUT_CASES_V6 = (
    StressCaseV6("holdout_plain", "The forecast arrived yesterday.", False, False, "control"),
    StressCaseV6("holdout_contrast", "However, the forecast changed.", True, False, "usage"),
    StressCaseV6("holdout_reference", "Maria called. She answered.", False, True, "usage"),
    StressCaseV6("holdout_word_contrast", "The word however is common.", False, False, "literal"),
    StressCaseV6("holdout_word_reference", "The word she is common.", False, False, "literal"),
    StressCaseV6("holdout_quote_contrast", 'A sign displayed "however".', False, False, "quotation"),
    StressCaseV6("holdout_quote_reference", 'A sign displayed "she".', False, False, "quotation"),
    StressCaseV6("holdout_unhandled_contrast", "A lecturer discussed however yesterday.", False, False, "unhandled"),
    StressCaseV6("holdout_unhandled_reference", "A lecturer discussed she yesterday.", False, False, "unhandled"),
    StressCaseV6("holdout_mixed", "The word however is common. However, plans changed.", True, False, "mixed"),
)


def evaluate_holdout_quality_v6(*, thresholds=QualityThresholdsV6()):
    report = evaluate_quality_gate_v6(HOLDOUT_CASES_V6, thresholds=thresholds)
    return {
        "contract": "future-xsus-core.v6.holdout-quality",
        "holdout_cases": len(HOLDOUT_CASES_V6),
        "gate": report,
        "known_challenge_errors_expected": True,
        "statistically_independent_sample": False,
        "deployment_approved": False,
    }
