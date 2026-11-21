"""Measure whether different prompts collapse to the same model context window.

Only aggregate counts are returned; no prompt text or token identifiers.
"""


def inspect_prompt_context_collisions_v1(tokenizer,model,conversations):
    from languages.en.text.normalization.model_input import prepare_model_input
    from languages.en.text.generation.conversation_format import prompt_tokens
    if not isinstance(conversations,(list,tuple)) or len(conversations)<2:
        raise ValueError("at least two conversations required")
    if type(model.context_size) is not int or model.context_size<1:
        raise ValueError("invalid model context size")
    full=[]
    windows=[]
    for conversation in conversations:
        prompt,_=prepare_model_input(conversation,model.prompt_format)
        tokens=prompt_tokens(tokenizer,prompt)
        full.append(tuple(tokens))
        windows.append(tuple(tokens[-model.context_size:]))
    distinct_full=len(set(full))
    distinct_windows=len(set(windows))
    counts={}
    for window in windows:
        counts[window]=counts.get(window,0)+1
    return {
        "contract":"future-xsus-core.prompt-context-collisions.v1",
        "cases":len(windows),
        "context_size":model.context_size,
        "distinct_full_prompts":distinct_full,
        "distinct_context_windows":distinct_windows,
        "colliding_cases":sum(count for count in counts.values() if count>1),
        "largest_collision_group":max(counts.values()),
        "all_context_windows_identical":distinct_windows==1,
        "context_collision_detected":distinct_windows<len(windows),
        "raw_text_exposed":False,
        "raw_token_ids_exposed":False,
        "raw_context_exposed":False,
        "release_authorized":False,
    }
