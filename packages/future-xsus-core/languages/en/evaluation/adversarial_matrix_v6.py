"""Independent adversarial cases for four experimental surface-cue filters."""
from .mention_stress_v6 import StressCaseV6
from .four_way_comparison_v6 import compare_four_filters_v6

ADVERSARIAL_MATRIX_V6 = (
    StressCaseV6("indirect_real_contrast", "The speaker mentioned however, costs rose.", True, False, "over_suppression"),
    StressCaseV6("indirect_real_reference", "The speaker mentioned she would return.", False, True, "over_suppression"),
    StressCaseV6("quoted_single_word_contrast", 'The speaker wrote "however" on a board.', False, False, "quotation"),
    StressCaseV6("quoted_single_word_reference", 'The speaker wrote "she" on a board.', False, False, "quotation"),
    StressCaseV6("quoted_sentence_contrast", '"However, costs rose."', True, False, "quoted_speech"),
    StressCaseV6("quoted_sentence_reference", '"She returned."', False, True, "quoted_speech"),
    StressCaseV6("metalinguistic_paraphrase", "A teacher discussed however in class.", False, False, "unhandled_mention"),
    StressCaseV6("metalinguistic_reference", "A teacher discussed she in class.", False, False, "unhandled_mention"),
    StressCaseV6("ordinary_contrast", "However, the report arrived.", True, False, "control"),
    StressCaseV6("ordinary_reference", "Alex called. She answered.", False, True, "control"),
)


def evaluate_adversarial_matrix_v6(cases=ADVERSARIAL_MATRIX_V6):
    cases = tuple(cases)
    report = compare_four_filters_v6(cases)
    final = report["metrics"]["indirect"]
    return {
        **report,
        "contract": "future-xsus-core.v6.adversarial-matrix",
        "known_residual_errors": {
            "contrast": final["contrast"]["fp"] + final["contrast"]["fn"],
            "reference": final["reference"]["fp"] + final["reference"]["fn"],
        },
        "release_gate_passed": False,
        "release_gate_evaluated": False,
        "adversarial_cases_are_representative": False,
    }
