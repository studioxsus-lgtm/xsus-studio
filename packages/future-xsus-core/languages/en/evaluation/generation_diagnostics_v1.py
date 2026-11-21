"""Privacy-preserving aggregate diagnostics for neural generation quality."""
from collections import Counter
from math import isfinite


def summarize_generation_diagnostics_v1(details):
    """Aggregate outputs without copying prompts, references or generated text."""
    if not isinstance(details,(list,tuple)):
        raise ValueError("Expected generation detail rows")
    outputs=[]
    accepted=0
    exact=0
    empty=0
    lengths=[]
    for row in details:
        if not isinstance(row,dict) or not isinstance(row.get("generated"),str):
            raise ValueError("Each row must include a generated string")
        if type(row.get("accepted")) is not bool or type(row.get("exact_match")) is not bool:
            raise ValueError("Each row must include boolean scores")
        generated=row["generated"]
        normalized=" ".join(generated.casefold().split())
        outputs.append(normalized)
        lengths.append(len(generated))
        empty+=not bool(generated.strip())
        accepted+=row["accepted"]
        exact+=row["exact_match"]
    counts=Counter(outputs)
    cases=len(details)
    return {
        "contract":"future-xsus-core.generation-diagnostics.v1",
        "cases":cases,
        "accepted":accepted,
        "exact_matches":exact,
        "empty_responses":empty,
        "distinct_normalized_responses":len(counts),
        "most_common_response_count":max(counts.values(),default=0),
        "mean_response_length":round(sum(lengths)/cases,3) if cases else 0.0,
        "all_responses_identical":cases>1 and len(counts)==1,
        "contains_generated_text":False,
    }
