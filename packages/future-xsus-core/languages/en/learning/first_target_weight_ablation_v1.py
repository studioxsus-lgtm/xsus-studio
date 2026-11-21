"""Controlled synthetic first-target weighting ablation; no checkpoint promotion."""
from copy import deepcopy
from languages.en.learning.first_target_weighted_training_v1 import train_first_target_weighted_v1
from languages.en.evaluation.first_target_rank_v1 import inspect_first_target_rank_v1
from languages.en.evaluation.generation_diagnostics_v1 import summarize_generation_diagnostics_v1
from languages.en.text.generation.generate import generate
from languages.en.text.generation.conversation_format import prompt_tokens
from languages.en.text.normalization.model_input import prepare_model_input


def run_first_target_weight_ablation_v1(tokenizer,baseline_model,encoded_training,benchmarks,*,learning_rate=0.008):
    if not isinstance(benchmarks,dict) or not benchmarks:
        raise ValueError("benchmarks required")
    if not isinstance(encoded_training,(list,tuple)) or not encoded_training:
        raise ValueError("encoded training required")
    arms={}
    for weight in (1,2,4,8):
        model=deepcopy(baseline_model)
        training=train_first_target_weighted_v1(
            model,encoded_training,learning_rate=learning_rate,first_target_weight=weight)
        results={}
        for name,cases in sorted(benchmarks.items()):
            if not cases:
                raise ValueError("empty benchmark")
            prefixes=[prompt_tokens(tokenizer,prepare_model_input(
                case.example.conversation,model.prompt_format)[0]) for case in cases]
            targets=[tokenizer.encode(case.example.response)[0] for case in cases]
            ranks=inspect_first_target_rank_v1(model,prefixes,targets)
            details=[case.score(generate(tokenizer,model,case.example.conversation)) for case in cases]
            results[name]={
                "first_target_rank":ranks,
                "generation":summarize_generation_diagnostics_v1(details),
            }
        arms[str(weight)]={"training":training,"benchmarks":results}
    return {
        "contract":"future-xsus-core.first-target-weight-ablation.v1",
        "arms":arms,
        "weights":[1,2,4,8],
        "baseline_checkpoint_mutated":False,
        "production_deployed":False,
        "human_release_required":True,
        "raw_text_exposed":False,
        "raw_token_ids_exposed":False,
    }
