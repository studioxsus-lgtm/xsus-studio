"""Read-only counterfactual: evaluate existing weights with wider model context.

Changing context_size here does not retrain or release a model. The
diagnostic isolates inference-time context visibility from learned quality.
"""
from copy import deepcopy
from languages.en.evaluation.prompt_context_collisions_v1 import inspect_prompt_context_collisions_v1
from languages.en.evaluation.prompt_target_identifiability_v1 import inspect_prompt_target_identifiability_v1
from languages.en.evaluation.teacher_forced_positions_v1 import inspect_teacher_forced_positions_v1
from languages.en.evaluation.first_target_rank_v1 import inspect_first_target_rank_v1
from languages.en.evaluation.context_window_decision_v1 import inspect_context_window_decision_v1
from languages.en.data.preparation.corpus import Example
from languages.en.training.train import _encode
from languages.en.text.normalization.model_input import prepare_model_input


def inspect_inference_context_counterfactual_v1(tokenizer, model, cases, *, windows=(16,32,64)):
    if not isinstance(cases,(list,tuple)) or len(cases)<2:
        raise ValueError("at least two cases required")
    if not isinstance(windows,(list,tuple)) or not windows or any(
        type(size) is not int or size<1 or size>4096 for size in windows
    ) or len(set(windows))!=len(windows):
        raise ValueError("invalid context windows")
    prepared=tuple(Example(prepare_model_input(case.example.conversation,model.prompt_format)[0],
                           case.example.response) for case in cases)
    encoded=_encode(tokenizer,prepared)
    groups={}
    for size in windows:
        counterfactual=deepcopy(model)
        counterfactual.context_size=size
        collisions=inspect_prompt_context_collisions_v1(tokenizer,counterfactual,
            [case.example.conversation for case in cases])
        contrast=inspect_prompt_target_identifiability_v1(counterfactual,encoded)
        positions=inspect_teacher_forced_positions_v1(counterfactual,encoded)
        ranks=inspect_first_target_rank_v1(counterfactual,
            [prefix for prefix,_ in encoded], [targets[0] for _,targets in encoded])
        groups[str(size)]={
            "distinct_context_windows":collisions["distinct_context_windows"],
            "colliding_cases":collisions["colliding_cases"],
            "matched_target_preferred_cases":contrast["contrast"]["matched_target_preferred_cases"],
            "greedy_winner_changed_cases":contrast["contrast"]["greedy_winner_changed_cases"],
            "first_target_top_one_correct":positions["segments"]["first"]["top_one_correct"],
            "first_target_cases":positions["segments"]["first"]["tokens"],
            "mean_first_target_rank":ranks["mean_target_rank"],
            "mean_best_to_target_logit_gap":ranks["mean_best_to_target_logit_gap"],
        }
    report={
        "contract":"future-xsus-core.inference-context-counterfactual.v1",
        "cases":len(cases),
        "trained_context_size":model.context_size,
        "windows":groups,
        "weights_retrained":False,
        "production_context_changed":False,
        "release_authorized":False,
        "raw_text_exposed":False,
        "raw_token_ids_exposed":False,
    }
    if all(str(size) in groups for size in (16,32,64)):
        report["context_window_decision"]=inspect_context_window_decision_v1(report)
    return report
