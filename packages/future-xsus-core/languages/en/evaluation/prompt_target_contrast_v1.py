"""Matched-versus-rotated prompt contrast on held-out reference first tokens.

The deterministic rotation tests whether the model prefers the correct prompt
for the same reference token. It is a diagnostic, not a causal proof.
"""
from math import isfinite


def inspect_prompt_target_contrast_v1(model, encoded_examples):
    if not isinstance(encoded_examples,(list,tuple)) or len(encoded_examples)<2:
        raise ValueError("at least two encoded examples required")
    rows=[]
    for prompt,targets in encoded_examples:
        if not isinstance(prompt,(list,tuple)) or not isinstance(targets,(list,tuple)) or not targets:
            raise ValueError("invalid encoded example")
        if any(type(t) is not int or not 0<=t<model.vocab_size for t in prompt):
            raise ValueError("invalid prompt tokens")
        target=targets[0]
        if type(target) is not int or not 0<=target<model.vocab_size:
            raise ValueError("invalid target token")
        rows.append((list(prompt),target))
    margins=[]
    changed_winners=0
    for index,(prompt,target) in enumerate(rows):
        alternate=rows[(index+1)%len(rows)][0]
        matched=model.logits(prompt)
        rotated=model.logits(alternate)
        if (len(matched)!=model.vocab_size or len(rotated)!=model.vocab_size or
            any(not isfinite(value) for value in matched+rotated)):
            raise ValueError("invalid model logits")
        margins.append(matched[target]-rotated[target])
        changed_winners+=max(range(model.vocab_size),key=matched.__getitem__)!=max(
            range(model.vocab_size),key=rotated.__getitem__)
    positive=sum(value>0 for value in margins)
    return {
        "contract":"future-xsus-core.prompt-target-contrast.v1",
        "cases":len(rows),
        "matched_target_preferred_cases":positive,
        "matched_target_preferred_rate":round(positive/len(rows),6),
        "mean_matched_target_logit_advantage":round(sum(margins)/len(margins),6),
        "greedy_winner_changed_cases":changed_winners,
        "raw_text_exposed":False,
        "raw_token_ids_exposed":False,
        "raw_logits_exposed":False,
        "release_authorized":False,
    }
