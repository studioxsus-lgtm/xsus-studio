"""Score frozen, independently held-out generated answers into aggregate evidence.

Exact match is deliberately narrow: it is not semantic correctness. This module
does not generate answers, train models, or retain raw examples in its output.
"""
from languages.en.evaluation.generation_quality_comparison_v1 import (
    inspect_generation_quality_comparison_v1,
)


def inspect_generation_quality_scoring_v1(references, generations_by_window, *,
                                          independent_holdout=False,
                                          weights_retrained=False):
    if independent_holdout is not True or weights_retrained is not False:
        raise ValueError("frozen independent holdout required")
    if not isinstance(references, (tuple, list)) or len(references) < 2:
        raise ValueError("at least two references required")
    if any(not isinstance(value, str) or not value.strip() for value in references):
        raise ValueError("nonempty reference strings required")
    if not isinstance(generations_by_window, dict) or set(generations_by_window) != {"16", "32", "64"}:
        raise ValueError("exactly three context windows required")
    rows = {}
    for size in ("16", "32", "64"):
        generations = generations_by_window[size]
        if not isinstance(generations, (tuple, list)) or len(generations) != len(references):
            raise ValueError("one generation per reference required")
        if any(not isinstance(value, str) for value in generations):
            raise ValueError("generation must be text")
        # Whitespace normalization only; no subjective semantic assessment.
        normalized = [value.strip() for value in generations]
        accepted = sum(value == reference.strip() for value, reference in zip(normalized, references))
        empty = sum(not value for value in normalized)
        rows[size] = {
            "evaluated_cases": len(references),
            "accepted_responses": accepted,
            "empty_responses": empty,
        }
    decision = inspect_generation_quality_comparison_v1({
        "cases": len(references),
        "independent_holdout": True,
        "weights_retrained": False,
        "windows": rows,
    })
    return {
        "contract": "future-xsus-core.generation-quality-scoring.v1",
        "metric": "whitespace_trimmed_exact_match",
        "cases": len(references),
        "windows": rows,
        "comparison": decision,
        "semantic_correctness_proven": False,
        "release_authorized": False,
        "raw_text_exposed": False,
        "raw_token_ids_exposed": False,
    }
