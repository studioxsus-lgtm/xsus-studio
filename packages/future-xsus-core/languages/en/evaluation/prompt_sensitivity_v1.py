"""Measure prompt sensitivity of model logits without exposing prompts or tokens."""
from math import isfinite


def inspect_prompt_sensitivity_v1(model, prefixes):
    if not isinstance(prefixes,(list,tuple)) or len(prefixes)<2:
        raise ValueError("At least two prompt prefixes are required")
    vectors=[]
    for prefix in prefixes:
        if not isinstance(prefix,(list,tuple)) or any(type(t) is not int or t<0 or t>=model.vocab_size for t in prefix):
            raise ValueError("Invalid prefix")
        logits=model.logits(prefix)
        if len(logits)!=model.vocab_size or any(not isfinite(value) for value in logits):
            raise ValueError("Invalid model logits")
        vectors.append(logits)
    winners=[max(range(len(logits)),key=logits.__getitem__) for logits in vectors]
    reference=vectors[0]
    max_deltas=[max(abs(a-b) for a,b in zip(reference,vector)) for vector in vectors[1:]]
    return {
        "contract":"future-xsus-core.prompt-sensitivity.v1",
        "cases":len(prefixes),
        "distinct_greedy_winners":len(set(winners)),
        "identical_greedy_winner":len(set(winners))==1,
        "mean_max_logit_delta_from_first":round(sum(max_deltas)/len(max_deltas),6),
        "max_logit_delta_from_first":round(max(max_deltas),6),
        "raw_text_exposed":False,
        "raw_token_ids_exposed":False,
        "raw_logits_exposed":False,
    }
