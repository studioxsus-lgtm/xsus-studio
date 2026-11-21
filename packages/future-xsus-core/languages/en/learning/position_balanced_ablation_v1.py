"""Compare position-balanced and uniform teacher forcing on identical synthetic holdouts."""
from copy import deepcopy
from languages.en.learning.position_balanced_training_v1 import train_position_balanced_v1
from languages.en.evaluation.teacher_forced_positions_v1 import inspect_teacher_forced_positions_v1
from languages.en.evaluation.prompt_target_contrast_v1 import inspect_prompt_target_contrast_v1
from languages.en.evaluation.generation_diagnostics_v1 import summarize_generation_diagnostics_v1
from languages.en.data.preparation.corpus import Example
from languages.en.training.train import _encode
from languages.en.text.normalization.model_input import prepare_model_input
from languages.en.text.generation.generate import generate


def run_position_balanced_ablation_v1(tokenizer,baseline_model,encoded_training,benchmarks,*,learning_rate=.008):
    if not isinstance(benchmarks,dict) or not benchmarks:
        raise ValueError("nonempty benchmarks required")
    if not isinstance(encoded_training,(list,tuple)) or not encoded_training:
        raise ValueError("nonempty encoded training required")
    arms={}
    for name,weights in (("uniform",(1,1,1)),("first2",(2,1,1)),("balanced2",(2,1,2)),("balanced3",(2,2,2))):
        model=deepcopy(baseline_model)
        training=train_position_balanced_v1(model,encoded_training,learning_rate=learning_rate,
            first_weight=weights[0],early_weight=weights[1],later_weight=weights[2])
        groups={}
        for benchmark,cases in sorted(benchmarks.items()):
            if not cases:
                raise ValueError("empty benchmark")
            prepared=tuple(Example(prepare_model_input(case.example.conversation,model.prompt_format)[0],
                                   case.example.response) for case in cases)
            encoded=_encode(tokenizer,prepared)
            positions=inspect_teacher_forced_positions_v1(model,encoded)
            contrast=inspect_prompt_target_contrast_v1(model,encoded)
            details=[case.score(generate(tokenizer,model,case.example.conversation)) for case in cases]
            groups[benchmark]={
                "teacher_forced_positions":positions,
                "prompt_target_contrast":contrast,
                "generation":summarize_generation_diagnostics_v1(details),
            }
        arms[name]={"training":training,"benchmarks":groups}
    control=arms["uniform"]["benchmarks"]
    decisions={}
    for name,arm in arms.items():
        regression=False
        accepted=0
        control_accepted=0
        for benchmark,row in arm["benchmarks"].items():
            reference=control[benchmark]
            accepted+=row["generation"]["accepted"]
            control_accepted+=reference["generation"]["accepted"]
            for segment in ("first","early","later"):
                current=row["teacher_forced_positions"]["segments"][segment]
                previous=reference["teacher_forced_positions"]["segments"][segment]
                if current["tokens"]!=previous["tokens"]:
                    raise ValueError("unequal holdout tokens")
                regression|=current["top_one_correct"]<previous["top_one_correct"]
            regression|=row["generation"]["accepted"]<reference["generation"]["accepted"]
        decisions[name]={
            "accepted":accepted,
            "accepted_delta_vs_uniform":accepted-control_accepted,
            "position_or_acceptance_regression":bool(regression),
            "quality_gain_proven":accepted>control_accepted and not regression,
        }
    return {
        "contract":"future-xsus-core.position-balanced-ablation.v1",
        "arms":arms,
        "decisions":decisions,
        "release_authorized":False,
        "human_release_required":True,
        "raw_text_exposed":False,
        "raw_token_ids_exposed":False,
    }
