"""Detect whether prompt-target contrast is identifiable on a heldout set.

When every reference begins with the same token, first-token prompt
contrast cannot distinguish prompt-specific target selection reliably.
"""
from languages.en.evaluation.prompt_target_contrast_v1 import inspect_prompt_target_contrast_v1


def inspect_prompt_target_identifiability_v1(model, encoded_examples):
    result=inspect_prompt_target_contrast_v1(model,encoded_examples)
    targets=[targets[0] for _,targets in encoded_examples]
    unique=len(set(targets))
    counts={}
    for target in targets:
        counts[target]=counts.get(target,0)+1
    dominant=max(counts.values())
    # The cyclic rotation telescopes to zero for a shared target:
    # sum_i(logit_i[t]-logit_(i+1)[t]) = 0.
    shared_target=unique==1
    return {
        "contract":"future-xsus-core.prompt-target-identifiability.v1",
        "cases":len(targets),
        "distinct_first_target_tokens":unique,
        "dominant_first_target_count":dominant,
        "dominant_first_target_rate":round(dominant/len(targets),6),
        "first_target_contrast_identifiable":not shared_target,
        "rotation_mean_structurally_zero":shared_target,
        "prompt_target_association_proven":False,
        "interpretation":"insufficient_target_diversity" if shared_target else "diagnostic_only",
        "contrast":result,
        "raw_text_exposed":False,
        "raw_token_ids_exposed":False,
        "release_authorized":False,
    }
