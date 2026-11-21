"""Read-only context-window sweep for prompt distinguishability.

No model weights or production context settings are changed.
"""
from languages.en.text.normalization.model_input import prepare_model_input
from languages.en.text.generation.conversation_format import prompt_tokens


def inspect_context_window_sweep_v1(tokenizer, prompt_format, conversations, *, windows=(16,32,64,128)):
    if not isinstance(conversations,(list,tuple)) or len(conversations)<2:
        raise ValueError("at least two conversations required")
    if not isinstance(windows,(list,tuple)) or not windows or any(
        type(size) is not int or size<1 or size>4096 for size in windows
    ) or len(set(windows))!=len(windows):
        raise ValueError("windows must be distinct positive integer sizes")
    encoded=[]
    for conversation in conversations:
        prompt,_=prepare_model_input(conversation,prompt_format)
        encoded.append(tuple(prompt_tokens(tokenizer,prompt)))
    groups={}
    for size in windows:
        counts={}
        for tokens in encoded:
            suffix=tokens[-size:]
            counts[suffix]=counts.get(suffix,0)+1
        groups[str(size)]={
            "distinct_context_windows":len(counts),
            "colliding_cases":sum(count for count in counts.values() if count>1),
            "largest_collision_group":max(counts.values()),
            "all_context_windows_identical":len(counts)==1,
        }
    first_distinct=next((size for size in sorted(windows)
        if groups[str(size)]["distinct_context_windows"]==len(encoded)),None)
    return {
        "contract":"future-xsus-core.context-window-sweep.v1",
        "cases":len(encoded),
        "distinct_full_prompts":len(set(encoded)),
        "window_results":groups,
        "smallest_tested_collision_free_window":first_distinct,
        "production_context_changed":False,
        "raw_text_exposed":False,
        "raw_token_ids_exposed":False,
        "release_authorized":False,
    }
