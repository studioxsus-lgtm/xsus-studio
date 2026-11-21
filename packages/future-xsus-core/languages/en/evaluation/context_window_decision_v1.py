"""Conservative, aggregate-only decision on frozen context-window evidence.

This module never trains, changes model parameters, or authorizes release.
"""
from math import isfinite


def inspect_context_window_decision_v1(report):
    if not isinstance(report, dict) or report.get("weights_retrained") is not False or report.get("release_authorized") is not False:
        raise ValueError("expected read-only counterfactual report")
    windows = report.get("windows")
    if not isinstance(windows, dict) or not all(str(size) in windows for size in (16, 32, 64)):
        raise ValueError("16, 32 and 64 token windows are required")
    cases = report.get("cases")
    if type(cases) is not int or cases < 2:
        raise ValueError("invalid case count")
    summary = {}
    for size in (16, 32, 64):
        row = windows[str(size)]
        if not isinstance(row, dict):
            raise ValueError("invalid window")
        rank = row.get("mean_first_target_rank")
        gap = row.get("mean_best_to_target_logit_gap")
        top = row.get("first_target_top_one_correct")
        matched = row.get("matched_target_preferred_cases")
        if any(type(value) not in (int, float) or not isfinite(value) for value in (rank, gap)) or rank < 1 or gap < 0:
            raise ValueError("invalid ranking metrics")
        if any(type(value) is not int or not 0 <= value <= cases for value in (top, matched)):
            raise ValueError("invalid counts")
        summary[str(size)] = {"mean_rank": rank, "mean_gap": gap, "top_one": top, "matched_preference": matched}
    base = summary["16"]
    comparisons = {}
    for size in ("32", "64"):
        row = summary[size]
        comparisons[size] = {
            "rank_delta_vs_16": round(row["mean_rank"] - base["mean_rank"], 4),
            "gap_delta_vs_16": round(row["mean_gap"] - base["mean_gap"], 6),
            "top_one_delta_vs_16": row["top_one"] - base["top_one"],
            "preference_delta_vs_16": row["matched_preference"] - base["matched_preference"],
            "rank_and_gap_both_improve": row["mean_rank"] < base["mean_rank"] and row["mean_gap"] < base["mean_gap"],
        }
    return {
        "contract": "future-xsus-core.context-window-decision.v1",
        "cases": cases,
        "comparisons": comparisons,
        "training_authorized": False,
        "release_authorized": False,
        "quality_improvement_proven": False,
        "independent_holdout_required": True,
        "raw_text_exposed": False,
        "raw_token_ids_exposed": False,
        "raw_logits_exposed": False,
    }
