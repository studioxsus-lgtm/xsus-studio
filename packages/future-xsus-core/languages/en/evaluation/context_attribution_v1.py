"""Inspect whether context-conditioned logits change the greedy token category.

This diagnostic returns only aggregate categories and margins, never prompts,
generated text, hidden vectors, or token identifiers.
"""
from math import isfinite
from languages.en.text.tokenizer import BYTE_OFFSET


def inspect_context_attribution_v1(tokenizer, model, prompt_token_sequences):
    if not isinstance(prompt_token_sequences,(list,tuple)) or not prompt_token_sequences:
        raise ValueError("Expected nonempty prompt-token sequences")
    if model.vocab_size<=BYTE_OFFSET or len(model.output_bias)!=model.vocab_size:
        raise ValueError("Invalid model vocabulary or output bias")
    candidates=range(BYTE_OFFSET,model.vocab_size)
    if any(not isfinite(value) for value in model.output_bias):
        raise ValueError("Output bias must be finite")
    bias_winner=max(candidates,key=lambda token:model.output_bias[token])
    def category(token):
        decoded=tokenizer.decode([token],errors="replace")
        if not decoded:
            return "non_rendering"
        if decoded.isspace():
            return "whitespace"
        if all(char.isprintable() and not char.isspace() for char in decoded):
            return "printable"
        return "control_or_replacement"
    switches=0
    whitespace_context_winners=0
    context_overrides_bias=0
    margins=[]
    for prompt in prompt_token_sequences:
        if not isinstance(prompt,(list,tuple)) or any(type(t) is not int or t<0 or t>=model.vocab_size for t in prompt):
            raise ValueError("Invalid prompt tokens")
        logits=model.logits(prompt)
        if len(logits)!=model.vocab_size or any(not isfinite(value) for value in logits):
            raise ValueError("Model returned invalid logits")
        winner=max(candidates,key=lambda token:logits[token])
        switches+=winner!=bias_winner
        whitespace_context_winners+=category(winner)=="whitespace"
        context_overrides_bias+=category(winner)!=category(bias_winner)
        margins.append(logits[winner]-logits[bias_winner])
    return {
        "contract":"future-xsus-core.context-attribution.v1",
        "cases":len(prompt_token_sequences),
        "bias_top_category":category(bias_winner),
        "context_winner_differs_from_bias":switches,
        "context_category_differs_from_bias":context_overrides_bias,
        "whitespace_context_winners":whitespace_context_winners,
        "mean_winner_advantage_over_bias":round(sum(margins)/len(margins),6),
        "raw_text_exposed":False,
        "raw_token_ids_exposed":False,
        "hidden_vectors_exposed":False,
    }
