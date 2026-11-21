"""Decompose greedy output decisions into output bias and hidden-state contribution.

Reports only aggregate statistics; does not expose tokens, prompts or activations.
"""
from math import isfinite
from languages.en.text.tokenizer import BYTE_OFFSET


def inspect_hidden_contribution_v1(tokenizer, model, prefixes):
    if not isinstance(prefixes,(list,tuple)) or not prefixes:
        raise ValueError("prefixes must be a nonempty sequence")
    if model.vocab_size<=BYTE_OFFSET or len(model.output_weights)!=model.vocab_size:
        raise ValueError("invalid output layer")
    if len(model.output_bias)!=model.vocab_size:
        raise ValueError("invalid output bias")
    candidates=range(BYTE_OFFSET,model.vocab_size)
    def category(token):
        decoded=tokenizer.decode([token],errors="replace")
        if not decoded:
            return "non_rendering"
        if decoded.isspace():
            return "whitespace"
        if all(char.isprintable() and not char.isspace() for char in decoded):
            return "printable"
        return "control_or_replacement"
    bias_winner=max(candidates,key=lambda t:model.output_bias[t])
    changed=0
    whitespace=0
    positive_hidden_margin=0
    margins=[]
    for prefix in prefixes:
        if not isinstance(prefix,(tuple,list)) or any(type(t) is not int or not 0<=t<model.vocab_size for t in prefix):
            raise ValueError("invalid prefix")
        _,hidden,logits=model._forward(prefix)
        if len(logits)!=model.vocab_size or any(not isfinite(v) for v in logits):
            raise ValueError("invalid logits")
        if any(not isfinite(v) for v in hidden):
            raise ValueError("invalid hidden state")
        winner=max(candidates,key=lambda t:logits[t])
        hidden_winner=sum(a*b for a,b in zip(model.output_weights[winner],hidden))
        hidden_bias_winner=sum(a*b for a,b in zip(model.output_weights[bias_winner],hidden))
        margin=hidden_winner-hidden_bias_winner
        margins.append(margin)
        positive_hidden_margin+=margin>0
        changed+=winner!=bias_winner
        whitespace+=category(winner)=="whitespace"
    return {
        "contract":"future-xsus-core.hidden-contribution.v1",
        "cases":len(prefixes),
        "bias_top_category":category(bias_winner),
        "context_changed_top_token":changed,
        "whitespace_context_winners":whitespace,
        "positive_hidden_margin_cases":positive_hidden_margin,
        "mean_hidden_advantage_over_bias_token":round(sum(margins)/len(margins),6),
        "raw_text_exposed":False,
        "raw_token_ids_exposed":False,
        "hidden_vectors_exposed":False,
    }
