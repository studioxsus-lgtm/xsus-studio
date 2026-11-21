"""Guard against later-token regression in weighted training ablations."""


def inspect_position_regression_v1(ablation):
    arms=ablation["arms"]
    if "1" not in arms:
        raise ValueError("weight 1 control is required")
    control=arms["1"]["benchmarks"]
    results={}
    for weight,arm in sorted(arms.items(),key=lambda pair:int(pair[0])):
        if set(arm["benchmarks"])!=set(control):
            raise ValueError("benchmark groups must match control")
        groups={}
        regression=False
        for name,row in sorted(arm["benchmarks"].items()):
            segments=row["teacher_forced_positions"]["segments"]
            control_segments=control[name]["teacher_forced_positions"]["segments"]
            deltas={}
            for segment in ("first","early","later"):
                current=segments[segment]
                baseline=control_segments[segment]
                if current["tokens"]!=baseline["tokens"]:
                    raise ValueError("position token counts must match control")
                delta=current["top_one_correct"]-baseline["top_one_correct"]
                deltas[segment]=delta
                if delta<0:
                    regression=True
            groups[name]=deltas
        results[weight]={"correct_token_deltas_by_group":groups,"position_regression":regression}
    return {
        "contract":"future-xsus-core.position-regression-guard.v1",
        "arms":results,
        "nonregressing_weights":[weight for weight,row in results.items() if not row["position_regression"]],
        "position_guard_authorizes_release":False,
        "human_release_required":True,
        "raw_text_exposed":False,
        "raw_token_ids_exposed":False,
    }
