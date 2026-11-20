"""Independent challenge fixtures and error breakdown for V6 surface signals."""
from dataclasses import dataclass
from .document_benchmark_v6 import DocumentCaseV6, evaluate_documents_v6


@dataclass(frozen=True, slots=True)
class ChallengeGroupV6:
    name: str
    cases: tuple[DocumentCaseV6, ...]


CHALLENGE_GROUPS_V6 = (
    ChallengeGroupV6("paragraph_boundaries", (
        DocumentCaseV6("blank_line", "One report.\n\nTwo reports.", 2, 2, False, False),
        DocumentCaseV6("single_newline", "One report.\nTwo reports.", 1, 2, False, False),
        DocumentCaseV6("three_blocks", "Alpha.\n\nBeta.\n\nGamma.", 3, 3, False, False),
    )),
    ChallengeGroupV6("contrast_cues", (
        DocumentCaseV6("however", "The plan changed. However, costs rose.", 1, 2, True, False),
        DocumentCaseV6("nevertheless", "Costs rose. Nevertheless, we continued.", 1, 2, True, False),
        DocumentCaseV6("plain_sentence", "Costs rose. The plan changed.", 1, 2, False, False),
    )),
    ChallengeGroupV6("reference_cues", (
        DocumentCaseV6("she", "Alex arrived. She waved.", 1, 2, False, True),
        DocumentCaseV6("they", "They arrived.", 1, 1, False, True),
        DocumentCaseV6("no_pronoun", "Alex arrived. Jordan waved.", 1, 2, False, False),
    )),
    ChallengeGroupV6("mixed_documents", (
        DocumentCaseV6("two_blocks_contrast", "The report arrived.\n\nHowever, she waited.", 2, 2, True, True),
        DocumentCaseV6("three_blocks_plain", "Alpha.\n\nBeta.\n\nGamma.", 3, 3, False, False),
        DocumentCaseV6("reference_and_contrast", "Alex arrived. However, she waited.", 1, 2, True, True),
    )),
)


def evaluate_challenges_v6(groups=CHALLENGE_GROUPS_V6) -> dict:
    """Return separate group scores; never silently pool duplicate case IDs."""
    groups = tuple(groups)
    if not groups or any(not isinstance(group, ChallengeGroupV6) for group in groups):
        raise ValueError("nonempty ChallengeGroupV6 collection required")
    names = [group.name for group in groups]
    if any(not isinstance(name, str) or not name for name in names) or len(set(names)) != len(names):
        raise ValueError("group names must be nonempty and unique")
    case_names = [case.name for group in groups for case in group.cases]
    if len(set(case_names)) != len(case_names):
        raise ValueError("case names must be unique across groups")
    reports = []
    for group in groups:
        result = evaluate_documents_v6(group.cases)
        failures_by_field = {field: 0 for field in result["field_accuracy"]}
        for failure in result["failures"]:
            failures_by_field[failure["field"]] += 1
        reports.append({
            "group": group.name,
            "cases": result["cases"],
            "accuracy": result["overall_accuracy"],
            "field_accuracy": result["field_accuracy"],
            "failures_by_field": failures_by_field,
            "failures": result["failures"],
        })
    count = sum(report["cases"] for report in reports)
    weighted = sum(report["accuracy"] * report["cases"] for report in reports) / count
    return {
        "contract": "future-xsus-core.v6.document-challenge",
        "groups": reports,
        "total_cases": count,
        "weighted_accuracy": weighted,
        "generalizes_to_unseen_text": False,
        "evaluates_semantics": False,
    }
