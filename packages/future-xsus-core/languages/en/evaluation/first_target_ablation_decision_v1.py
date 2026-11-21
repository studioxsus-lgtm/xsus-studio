"""Conservative comparison of isolated first-token weighting arms."""


def summarize_first_target_ablation_v1(ablation):
    arms=ablation["arms"]
    control=arms["1"]["benchmarks"]
    results={}
    for weight in ("1","2","4","8"):
        benchmarks=arms[weight]["benchmarks"]
        if set(benchmarks)!=set(control):
            raise ValueError("benchmark groups must match control")
        cases=sum(row["generation"]["cases"] for row in benchmarks.values())
        accepted=sum(row["generation"]["accepted"] for row in benchmarks.values())
        distinct=sum(row["generation"]["distinct_normalized_responses"] for row in benchmarks.values())
        mean_rank=sum(row["first_target_rank"]["mean_target_rank"]*row["first_target_rank"]["cases"] for row in benchmarks.values())/cases
        control_accepted=sum(row["generation"]["accepted"] for row in control.values())
        regressions=any(row["generation"]["accepted"]<control[name]["generation"]["accepted"] for name,row in benchmarks.items())
        results[weight]={
            "cases":cases,
            "accepted":accepted,
            "acceptance_delta_vs_control":accepted-control_accepted,
            "mean_first_target_rank":round(mean_rank,4),
            "sum_distinct_responses_by_benchmark":distinct,
            "holdout_regression":regressions,
            "quality_gain_proven":accepted>control_accepted and not regressions,
        }
    eligible=[weight for weight,row in results.items() if weight!="1" and row["quality_gain_proven"]]
    return {
        "contract":"future-xsus-core.first-target-ablation-decision.v1",
        "arms":results,
        "quality_improving_weights":eligible,
        "recommended_for_release":None,
        "human_release_required":True,
        "raw_text_exposed":False,
        "raw_token_ids_exposed":False,
    }
