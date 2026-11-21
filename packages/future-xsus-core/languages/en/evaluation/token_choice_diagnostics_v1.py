"""Aggregate privacy-safe token selection diagnostics for a neural checkpoint."""
from collections import Counter

from languages.en.text.generation.conversation_format import prompt_tokens
from languages.en.text.normalization.model_input import prepare_model_input
from languages.en.text.tokenizer import BYTE_OFFSET, EOS


def inspect_token_choices_v1(tokenizer, model, conversation, *, steps=32):
    """Inspect greedy token choices, without returning any prompt or generated text."""
    if type(steps) is not int or not 1 <= steps <= 256:
        raise ValueError("steps must be an integer between 1 and 256")
    prompt,_=prepare_model_input(conversation,model.prompt_format)
    prefix=prompt_tokens(tokenizer,prompt)[-model.context_size:]
    categories=Counter()
    chosen=[]
    eos_preferred=0
    for _ in range(steps):
        logits=model.logits(prefix)
        candidate=max(range(BYTE_OFFSET,model.vocab_size),key=logits.__getitem__)
        if logits[EOS]>=logits[candidate]:
            eos_preferred+=1
        decoded=tokenizer.decode([candidate],errors="replace")
        if not decoded:
            category="non_rendering"
        elif decoded.isspace():
            category="whitespace"
        elif all(char.isprintable() and not char.isspace() for char in decoded):
            category="printable"
        else:
            category="control_or_replacement"
        categories[category]+=1
        chosen.append(candidate)
        prefix.append(candidate)
    return {
        "contract":"future-xsus-core.token-choice-diagnostics.v1",
        "steps":steps,
        "eos_preferred_steps":eos_preferred,
        "whitespace_token_steps":categories["whitespace"],
        "printable_token_steps":categories["printable"],
        "non_rendering_token_steps":categories["non_rendering"],
        "control_or_replacement_token_steps":categories["control_or_replacement"],
        "distinct_token_count":len(set(chosen)),
        "raw_token_ids_exposed":False,
        "raw_text_exposed":False,
    }
