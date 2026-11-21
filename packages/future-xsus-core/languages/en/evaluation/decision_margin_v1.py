"""Aggregate greedy decision margins across prompts without exposing logits."""
from math import isfinite
from languages.en.text.tokenizer import BYTE_OFFSET


def inspect_decision_margin_v1(tokenizer,model,prefixes):
    if not isinstance(prefixes,(list,tuple)) or not prefixes:
        raise ValueError("prefixes must be nonempty")
    if model.vocab_size<=BYTE_OFFSET:
        raise ValueError("invalid vocabulary")
    gaps=[]
    categories=[]
    for prefix in prefixes:
        if not isinstance(prefix,(list,tuple)) or any(type(t) is not int or not 0<=t<model.vocab_size for t in prefix):
            raise ValueError("invalid prefix")
        logits=model.logits(prefix)
        if len(logits)!=model.vocab_size or any(not isfinite(v) for v in logits):
            raise ValueError("invalid logits")
        ranked=sorted(range(BYTE_OFFSET,model.vocab_size),key=logits.__getitem__,reverse=True)
        if len(ranked)<2:
            raise ValueError("need at least two generatable tokens")
        first,second=ranked[:2]
        gaps.append(logits[first]-logits[second])
        decoded=tokenizer.decode([first],errors="replace")
        categories.append("whitespace" if decoded.isspace() else "other")
    return {
        "contract":"future-xsus-core.decision-margin.v1",
        "cases":len(prefixes),
        "whitespace_winner_cases":categories.count("whitespace"),
        "mean_top_two_margin":round(sum(gaps)/len(gaps),6),
        "min_top_two_margin":round(min(gaps),6),
        "max_top_two_margin":round(max(gaps),6),
        "raw_logits_exposed":False,
        "raw_token_ids_exposed":False,
        "raw_text_exposed":False,
    }
