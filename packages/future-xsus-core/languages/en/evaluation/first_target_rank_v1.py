"""Evaluate teacher-forced first-target ranking without disclosing examples."""
from math import isfinite
from languages.en.text.tokenizer import BYTE_OFFSET


def inspect_first_target_rank_v1(model, prefixes, first_targets):
    if not isinstance(prefixes,(list,tuple)) or not prefixes or len(prefixes)!=len(first_targets):
        raise ValueError("prefixes and targets must have equal nonzero lengths")
    ranks=[]
    margins=[]
    top_one=0
    for prefix,target in zip(prefixes,first_targets):
        if not isinstance(prefix,(tuple,list)) or any(type(t) is not int or not 0<=t<model.vocab_size for t in prefix):
            raise ValueError("invalid prefix")
        if type(target) is not int or not BYTE_OFFSET<=target<model.vocab_size:
            raise ValueError("invalid first target")
        logits=model.logits(prefix)
        if len(logits)!=model.vocab_size or any(not isfinite(value) for value in logits):
            raise ValueError("invalid logits")
        candidates=range(BYTE_OFFSET,model.vocab_size)
        rank=1+sum(logits[token]>logits[target] for token in candidates)
        best=max(logits[token] for token in candidates)
        ranks.append(rank)
        margins.append(best-logits[target])
        top_one+=rank==1
    return {
        "contract":"future-xsus-core.first-target-rank.v1",
        "cases":len(prefixes),
        "target_top_one_cases":top_one,
        "mean_target_rank":round(sum(ranks)/len(ranks),4),
        "mean_best_to_target_logit_gap":round(sum(margins)/len(margins),6),
        "max_best_to_target_logit_gap":round(max(margins),6),
        "raw_text_exposed":False,
        "raw_token_ids_exposed":False,
        "raw_logits_exposed":False,
    }
