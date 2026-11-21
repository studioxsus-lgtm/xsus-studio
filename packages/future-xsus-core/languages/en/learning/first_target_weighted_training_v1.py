"""Opt-in first-target weighted teacher forcing for isolated experiments.

No checkpoint is saved or released here. Default production training is unchanged.
"""


def train_first_target_weighted_v1(model, encoded_examples, *, learning_rate, first_target_weight=1):
    if type(first_target_weight) is not int or not 1 <= first_target_weight <= 8:
        raise ValueError("first_target_weight must be an integer between 1 and 8")
    if type(learning_rate) not in (int,float) or not 0 < learning_rate <= 0.1:
        raise ValueError("learning_rate must be positive and at most 0.1")
    if not isinstance(encoded_examples,(list,tuple)) or not encoded_examples:
        raise ValueError("encoded_examples must be nonempty")
    steps=0
    first_steps=0
    for prompt,targets in encoded_examples:
        if not isinstance(prompt,(list,tuple)) or not isinstance(targets,(list,tuple)) or not targets:
            raise ValueError("each encoded example must contain prompt and targets")
        prefix=list(prompt)
        for position,target in enumerate(targets):
            repeats=first_target_weight if position==0 else 1
            for _ in range(repeats):
                model.train_step(prefix,target,learning_rate)
                steps+=1
                first_steps+=position==0
            prefix.append(target)
    return {
        "contract":"future-xsus-core.first-target-weighted-training.v1",
        "examples":len(encoded_examples),
        "gradient_steps":steps,
        "first_target_gradient_steps":first_steps,
        "first_target_weight":first_target_weight,
        "raw_text_exposed":False,
        "raw_token_ids_exposed":False,
    }
