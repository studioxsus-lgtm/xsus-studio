"""Compare independently scored free-running generations, never token-rank proxies.

This read-only report is diagnostic. No automatic training or release decision.
"""


def inspect_generation_quality_comparison_v1(evidence):
    if not isinstance(evidence, dict):
        raise ValueError("invalid generation evidence")
    if evidence.get("independent_holdout") is not True:
        raise ValueError("independent holdout evidence required")
    if evidence.get("weights_retrained") is not False:
        raise ValueError("read-only comparison required")
    windows = evidence.get("windows")
    if not isinstance(windows, dict) or not all(str(n) in windows for n in (16, 32, 64)):
        raise ValueError("16/32/64 generation evidence required")
    cases = evidence.get("cases")
    if type(cases) is not int or cases < 2:
        raise ValueError("invalid case count")
    summaries = {}
    for size in (16, 32, 64):
        row = windows[str(size)]
        if not isinstance(row, dict):
            raise ValueError("invalid generation window")
        evaluated = row.get("evaluated_cases")
        accepted = row.get("accepted_responses")
        empty = row.get("empty_responses")
        if type(evaluated) is not int or evaluated != cases:
            raise ValueError("mismatched generation evaluation count")
        if type(accepted) is not int or not 0 <= accepted <= cases:
            raise ValueError("invalid accepted count")
        if type(empty) is not int or not 0 <= empty <= cases:
            raise ValueError("invalid empty count")
        if accepted + empty > cases:
            raise ValueError("accepted and empty counts overlap")
        summaries[str(size)] = {"accepted": accepted, "empty": empty}
    baseline = summaries["16"]
    comparisons = {}
    for size in ("32", "64"):
        row = summaries[size]
        comparisons[size] = {
            "accepted_delta_vs_16": row["accepted"] - baseline["accepted"],
            "empty_delta_vs_16": row["empty"] - baseline["empty"],
            "acceptance_increased_without_more_empty": (
                row["accepted"] > baseline["accepted"] and row["empty"] <= baseline["empty"]
            ),
        }
    return {
        "contract": "future-xsus-core.generation-quality-comparison.v1",
        "cases": cases,
        "comparisons": comparisons,
        "generation_quality_evidence_present": True,
        "training_authorized": False,
        "release_authorized": False,
        "quality_improvement_proven": False,
        "manual_review_required": True,
        "raw_text_exposed": False,
        "raw_token_ids_exposed": False,
        "raw_logits_exposed": False,
    }
