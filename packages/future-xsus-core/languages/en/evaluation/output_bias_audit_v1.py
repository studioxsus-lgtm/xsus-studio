"""Privacy-preserving diagnostic of output-bias versus context-conditioned token choice."""
from collections import Counter
from math import isfinite
from languages.en.text.tokenizer import BYTE_OFFSET, EOS


def inspect_output_bias_v1(tokenizer,model):
    """Compare raw output bias to a zero-context forward pass; no token IDs or text."""
    if not hasattr(model,"output_bias") or len(model.output_bias)!=model.vocab_size:
        raise ValueError("Model must expose a complete output bias vector")
    if model.vocab_size<=BYTE_OFFSET:
        raise ValueError("Model vocabulary contains no generatable tokens")
    if any(not isfinite(v) for v in model.output_bias):
        raise ValueError("Output bias must be finite")
    def category(token):
        decoded=tokenizer.decode([token],errors="replace")
        if not decoded:
            return "non_rendering"
        if decoded.isspace():
            return "whitespace"
        if all(c.isprintable() and not c.isspace() for c in decoded):
            return "printable"
        return "control_or_replacement"
    candidates=range(BYTE_OFFSET,model.vocab_size)
    bias_top=max(candidates,key=lambda t:model.output_bias[t])
    logits=model.logits([])
    if len(logits)!=model.vocab_size or any(not isfinite(v) for v in logits):
        raise ValueError("Model must return finite logits")
    context_top=max(candidates,key=lambda t:logits[t])
    return {
        "contract":"future-xsus-core.output-bias-audit.v1",
        "bias_top_category":category(bias_top),
        "empty_context_top_category":category(context_top),
        "bias_top_matches_empty_context":bias_top==context_top,
        "eos_bias_exceeds_best_generated":model.output_bias[EOS]>=model.output_bias[bias_top],
        "raw_token_ids_exposed":False,
        "raw_text_exposed":False,
    }
