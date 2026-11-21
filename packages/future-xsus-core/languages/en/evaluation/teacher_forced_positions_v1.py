"""Aggregate teacher-forced reference-token accuracy by answer position.

This diagnostic does not expose reference strings, token IDs or logits.
"""
from math import isfinite
from languages.en.text.tokenizer import BYTE_OFFSET


def inspect_teacher_forced_positions_v1(model, encoded_examples, *, early_window=4):
    if type(early_window) is not int or not 1<=early_window<=32:
        raise ValueError("early_window must be between 1 and 32")
    if not isinstance(encoded_examples,(list,tuple)) or not encoded_examples:
        raise ValueError("encoded examples required")
    totals={"first":0,"early":0,"later":0}
    correct={"first":0,"early":0,"later":0}
    gaps={"first":0.0,"early":0.0,"later":0.0}
    for prefix,targets in encoded_examples:
        if not isinstance(prefix,(list,tuple)) or not isinstance(targets,(list,tuple)) or not targets:
            raise ValueError("invalid encoded example")
        context=list(prefix)
        for position,target in enumerate(targets):
            if type(target) is not int or not BYTE_OFFSET<=target<model.vocab_size:
                # EOS is not a generatable token; exclude it from this analysis.
                if type(target) is int and target==1:
                    context.append(target)
                    continue
                raise ValueError("invalid target")
            if any(type(token) is not int or not 0<=token<model.vocab_size for token in context):
                raise ValueError("invalid context")
            logits=model.logits(context)
            if len(logits)!=model.vocab_size or any(not isfinite(value) for value in logits):
                raise ValueError("invalid logits")
            best=max(range(BYTE_OFFSET,model.vocab_size),key=logits.__getitem__)
            segment="first" if position==0 else "early" if position<early_window else "later"
            totals[segment]+=1
            correct[segment]+=best==target
            gaps[segment]+=logits[best]-logits[target]
            context.append(target)
    return {
        "contract":"future-xsus-core.teacher-forced-positions.v1",
        "examples":len(encoded_examples),
        "early_window":early_window,
        "segments":{
            segment:{
                "tokens":totals[segment],
                "top_one_correct":correct[segment],
                "top_one_accuracy":round(correct[segment]/totals[segment],6) if totals[segment] else None,
                "mean_best_to_target_gap":round(gaps[segment]/totals[segment],6) if totals[segment] else None,
            } for segment in ("first","early","later")
        },
        "raw_text_exposed":False,
        "raw_token_ids_exposed":False,
        "raw_logits_exposed":False,
    }
