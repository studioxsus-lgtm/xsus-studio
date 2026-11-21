"""Opt-in position-balanced teacher forcing for isolated research only."""


def train_position_balanced_v1(model, encoded_examples, *, learning_rate, first_weight=2, early_weight=1, later_weight=2, early_window=4):
    for name,value in (("first_weight",first_weight),("early_weight",early_weight),("later_weight",later_weight)):
        if type(value) is not int or not 1<=value<=8:
            raise ValueError(f"{name} must be an integer between 1 and 8")
    if type(early_window) is not int or not 2<=early_window<=32:
        raise ValueError("early_window must be an integer between 2 and 32")
    if type(learning_rate) not in (int,float) or not 0<learning_rate<=0.1:
        raise ValueError("learning_rate must be positive and at most 0.1")
    if not isinstance(encoded_examples,(list,tuple)) or not encoded_examples:
        raise ValueError("nonempty encoded examples required")
    counts={"first":0,"early":0,"later":0}
    for prompt,targets in encoded_examples:
        if not isinstance(prompt,(list,tuple)) or not isinstance(targets,(list,tuple)) or not targets:
            raise ValueError("each example must have a prompt and targets")
        prefix=list(prompt)
        for position,target in enumerate(targets):
            segment="first" if position==0 else "early" if position<early_window else "later"
            repeats={"first":first_weight,"early":early_weight,"later":later_weight}[segment]
            for _ in range(repeats):
                model.train_step(prefix,target,learning_rate)
                counts[segment]+=1
            prefix.append(target)
    return {
        "contract":"future-xsus-core.position-balanced-training.v1",
        "examples":len(encoded_examples),
        "weights":{"first":first_weight,"early":early_weight,"later":later_weight},
        "gradient_steps_by_position":counts,
        "gradient_steps":sum(counts.values()),
        "production_deployed":False,
        "raw_text_exposed":False,
        "raw_token_ids_exposed":False,
    }
