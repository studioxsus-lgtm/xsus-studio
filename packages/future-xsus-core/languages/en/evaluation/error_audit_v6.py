"""Confusion-matrix audit for explicitly labeled document signals.

This evaluates exact surface cues only, not linguistic understanding.
"""
from .document_benchmark_v6 import DocumentCaseV6, evaluate_documents_v6

BOOLEAN_FIELDS = ("has_contrast", "has_reference")


def audit_document_errors_v6(cases) -> dict:
    cases = tuple(cases)
    if not cases or any(not isinstance(case, DocumentCaseV6) for case in cases):
        raise ValueError("nonempty DocumentCaseV6 collection required")
    names = [case.name for case in cases]
    if any(not isinstance(name, str) or not name for name in names) or len(names) != len(set(names)):
        raise ValueError("case names must be nonempty and unique")
    report = evaluate_documents_v6(cases)
    failures = {(item["case"], item["field"]): item for item in report["failures"]}
    matrix = {}
    for field in BOOLEAN_FIELDS:
        counts = {"tp": 0, "tn": 0, "fp": 0, "fn": 0}
        for case in cases:
            expected = getattr(case, field)
            if type(expected) is not bool:
                raise ValueError("boolean labels must be bool")
            mismatch = failures.get((case.name, field))
            actual = not expected if mismatch else expected
            if actual and expected:
                counts["tp"] += 1
            elif not actual and not expected:
                counts["tn"] += 1
            elif actual:
                counts["fp"] += 1
            else:
                counts["fn"] += 1
        precision_denominator = counts["tp"] + counts["fp"]
        recall_denominator = counts["tp"] + counts["fn"]
        counts["precision"] = (counts["tp"] / precision_denominator
                               if precision_denominator else None)
        counts["recall"] = (counts["tp"] / recall_denominator
                            if recall_denominator else None)
        matrix[field] = counts
    return {
        "contract": "future-xsus-core.v6.document-error-audit",
        "cases": len(cases),
        "confusion": matrix,
        "failures": report["failures"],
        "evaluates_semantics": False,
        "precision_recall_undefined_when_no_positives": True,
    }


ADVERSARIAL_CASES_V6 = (
    DocumentCaseV6("contrast_literal", "The word however appears in a sentence.", 1, 1, False, False),
    DocumentCaseV6("reference_literal", "The word she appears in this sentence.", 1, 1, False, False),
    DocumentCaseV6("contrast_real", "Costs rose. However, the plan continued.", 1, 2, True, False),
    DocumentCaseV6("reference_real", "Alex arrived. She waved.", 1, 2, False, True),
    DocumentCaseV6("negative_plain", "The report arrived. The report was signed.", 1, 2, False, False),
)
