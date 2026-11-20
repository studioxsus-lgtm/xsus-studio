"""Small reproducible gold-label benchmark for explicit document signals.

Scores only documented observable signals. Does not measure general
language understanding, factual correctness or semantic coherence.
"""
from dataclasses import dataclass
from . import __name__ as _module_name
from ..text.paragraph_structure_v6 import analyze_paragraphs_v6
from ..text.discourse_v6 import analyze_discourse_v6
from ..text.reference_signals_v6 import analyze_reference_signals_v6


@dataclass(frozen=True, slots=True)
class DocumentCaseV6:
    name: str
    text: str
    paragraph_count: int
    sentence_count: int
    has_contrast: bool
    has_reference: bool


CASES_V6 = (
    DocumentCaseV6("single", "The report arrived.", 1, 1, False, False),
    DocumentCaseV6("two_paragraphs", "The report arrived.\n\nThe report was signed.", 2, 2, False, False),
    DocumentCaseV6("contrast", "The draft is ready. However, the review is pending.", 1, 2, True, False),
    DocumentCaseV6("reference", "Alex arrived. She waved.", 1, 2, False, True),
    DocumentCaseV6("both", "Alex arrived. However, she waited.", 1, 2, True, True),
    DocumentCaseV6("sequence", "First, read the report. Next, sign the report.", 1, 2, False, False),
    DocumentCaseV6("three_paragraphs", "Alpha.\n\nBeta.\n\nGamma.", 3, 3, False, False),
    DocumentCaseV6("opening_reference", "They arrived.", 1, 1, False, True),
)


def evaluate_documents_v6(cases=CASES_V6) -> dict:
    """Exact field accuracy over a fixed, labeled collection."""
    cases = tuple(cases)
    if not cases:
        raise ValueError("at least one case is required")
    if any(not isinstance(case, DocumentCaseV6) for case in cases):
        raise ValueError("cases must contain DocumentCaseV6 records")
    fields = ("paragraph_count", "sentence_count", "has_contrast", "has_reference")
    correct = {field: 0 for field in fields}
    failures = []
    for case in cases:
        paragraphs = analyze_paragraphs_v6(case.text)
        discourse = analyze_discourse_v6(case.text)
        references = analyze_reference_signals_v6(case.text)
        actual = {
            "paragraph_count": paragraphs.paragraph_count,
            "sentence_count": discourse.sentence_count,
            "has_contrast": any(label == "contrast"
                                for _, label, _ in discourse.explicit_cues),
            "has_reference": bool(references.references),
        }
        expected = {field: getattr(case, field) for field in fields}
        for field in fields:
            if actual[field] == expected[field]:
                correct[field] += 1
            else:
                failures.append({"case": case.name, "field": field,
                                 "expected": expected[field], "actual": actual[field]})
    total = len(cases)
    return {
        "contract": "future-xsus-core.v6.document-benchmark",
        "cases": total,
        "fields_per_case": len(fields),
        "field_accuracy": {field: correct[field] / total for field in fields},
        "overall_accuracy": sum(correct.values()) / (total * len(fields)),
        "failures": failures,
        "scope": "explicit document signals on a small fixed labeled set",
        "general_language_understanding": False,
    }
