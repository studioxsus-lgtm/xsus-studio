"""Privacy-safe diagnostics for teacher-forced target-token distributions."""
from collections import Counter

from languages.en.text.tokenizer import EOS


def summarize_target_tokens_v1(tokenizer, encoded_examples):
    """Summarize target categories without retaining raw examples or token IDs."""
    if not isinstance(encoded_examples,(tuple,list)):
        raise ValueError("encoded_examples must be a sequence")
    counts=Counter()
    examples=0
    for item in encoded_examples:
        if not isinstance(item,(tuple,list)) or len(item)!=2:
            raise ValueError("Expected (prompt, targets) pairs")
        _,targets=item
        if not isinstance(targets,(tuple,list)):
            raise ValueError("targets must be a sequence")
        examples+=1
        for token in targets:
            if type(token) is not int:
                raise ValueError("target token must be an integer")
            if token==EOS:
                counts["eos"]+=1
                continue
            decoded=tokenizer.decode([token],errors="replace")
            if not decoded:
                counts["non_rendering"]+=1
            elif decoded.isspace():
                counts["whitespace"]+=1
            elif all(char.isprintable() and not char.isspace() for char in decoded):
                counts["printable"]+=1
            else:
                counts["control_or_replacement"]+=1
    total=sum(counts.values())
    return {
        "contract":"future-xsus-core.target-token-distribution.v1",
        "examples":examples,
        "target_tokens":total,
        "eos_tokens":counts["eos"],
        "whitespace_tokens":counts["whitespace"],
        "printable_tokens":counts["printable"],
        "non_rendering_tokens":counts["non_rendering"],
        "control_or_replacement_tokens":counts["control_or_replacement"],
        "whitespace_share":round(counts["whitespace"]/total,6) if total else 0.0,
        "raw_text_exposed":False,
        "raw_token_ids_exposed":False,
    }
