"""Run a reproducible synthetic-feedback neural learning experiment.

Synthetic examples only; benchmark scores are real but very small.
Never use this report to authorize a model release.
"""
import argparse
import json
from pathlib import Path
from tempfile import TemporaryDirectory

from core.contracts.request import Conversation
from languages.en.data.preparation.corpus import Example
from languages.en.learning.feedback_store import SQLiteFeedbackStore
from languages.en.learning.autonomous_candidate_cycle_v1 import (
    CandidateCycleRequestV1,execute_autonomous_candidate_cycle_v1,
)
from languages.en.evaluation.generation_diagnostics_v1 import summarize_generation_diagnostics_v1
from languages.en.evaluation.token_choice_diagnostics_v1 import inspect_token_choices_v1
from languages.en.evaluation.target_token_distribution_v1 import summarize_target_tokens_v1
from languages.en.evaluation.output_bias_audit_v1 import inspect_output_bias_v1
from languages.en.evaluation.context_attribution_v1 import inspect_context_attribution_v1
from languages.en.evaluation.hidden_contribution_v1 import inspect_hidden_contribution_v1
from languages.en.text.generation.conversation_format import prompt_tokens
from languages.en.text.normalization.model_input import prepare_model_input
from languages.en.training.train import _encode
from languages.en.evaluation.compare import load_cases
from languages.en.models.checkpoint import load_checkpoint
from languages.en.text.generation.generate import generate
from languages.en.models.checkpoint import save_checkpoint
from languages.en.models.neural_model import NeuralLanguageModel
from languages.en.text.tokenizer import BytePairTokenizer


def run_synthetic_feedback_experiment_v1():
    with TemporaryDirectory(prefix="xsus-synthetic-learning-") as temporary:
        root=Path(temporary)
        store=SQLiteFeedbackStore(root/"feedback.sqlite3")
        training=root/"training.jsonl"
        training.write_text("".join(json.dumps({
            "prompt":f"Curated training request {i}",
            "response":f"Curated answer {i}."})+"\n" for i in range(24)),encoding="utf-8")
        for i in range(12):
            record=store.submit("synthetic-test-owner",Example(
                Conversation(f"Reviewed synthetic question {i}"),
                f"Approved synthetic answer {i}."),consent=True)
            store.review("synthetic-test-owner",record.example_id,approved=True)
        tokenizer=BytePairTokenizer()
        model=NeuralLanguageModel.initialize(
            vocab_size=tokenizer.vocab_size,hidden_size=4,context_size=16,seed=17)
        baseline=root/"baseline.json.gz"
        save_checkpoint(baseline,tokenizer,model)
        evaluations={}
        for version in ("written-v4","written-v5"):
            path=root/(version+".jsonl")
            rows=[{"id":f"{version}-unseen-{i:02d}",
                   "prompt":f"Explain an independent synthetic topic {version} case {i}.",
                   "response":f"Independent reference sentence {i}.",
                   "facts":[],"patterns":[f"independent reference sentence {i}\\."]}
                  for i in range(10)]
            path.write_text("".join(json.dumps(row)+"\n" for row in rows),encoding="utf-8")
            evaluations[version]=path
        request=CandidateCycleRequestV1(
            "synthetic-test-owner","grammar",baseline,training,evaluations,
            root/"candidate.json.gz",root/"report.json",epochs=2,replay_examples=8)
        result=execute_autonomous_candidate_cycle_v1(store,request,approved_execution=True)
        report=result["candidate_report"]
        baseline_tokenizer,baseline_model,_=load_checkpoint(baseline)
        candidate_tokenizer,candidate_model,_=load_checkpoint(root/"candidate.json.gz")
        baseline_output_bias_audit=inspect_output_bias_v1(baseline_tokenizer,baseline_model)
        candidate_output_bias_audit=inspect_output_bias_v1(candidate_tokenizer,candidate_model)
        target_rows=[json.loads(line) for line in training.read_text(encoding="utf-8").splitlines()]
        target_examples=tuple(Example(Conversation(row["prompt"]),row["response"]) for row in target_rows)
        training_target_distribution=summarize_target_tokens_v1(
            candidate_tokenizer,_encode(candidate_tokenizer,target_examples))
        benchmarks={}
        for name,scores in sorted(report["benchmarks"].items()):
            cases=load_cases(evaluations[name])
            min_length_details=[case.score(generate(
                candidate_tokenizer,candidate_model,case.example.conversation,
                min_new_tokens=8)) for case in cases]
            visible_details=[case.score(generate(
                candidate_tokenizer,candidate_model,case.example.conversation,
                min_visible_chars=8)) for case in cases]
            encoded_prompts=[prompt_tokens(candidate_tokenizer,
                prepare_model_input(case.example.conversation,candidate_model.prompt_format)[0])
                for case in cases]
            context_attribution=inspect_context_attribution_v1(
                candidate_tokenizer,candidate_model,encoded_prompts)
            hidden_contribution=inspect_hidden_contribution_v1(
                candidate_tokenizer,candidate_model,encoded_prompts)
            token_choice_diagnostics=[inspect_token_choices_v1(
                candidate_tokenizer,candidate_model,case.example.conversation,
                steps=32) for case in cases]
            visible_first_details=[case.score(generate(
                candidate_tokenizer,candidate_model,case.example.conversation,
                min_visible_chars=1,avoid_leading_whitespace=True)) for case in cases]
            benchmarks[name]={
                "cases":scores["baseline"]["cases"],
                "baseline_accepted":scores["baseline"]["accepted"],
                "candidate_accepted":scores["candidate"]["accepted"],
                "baseline_exact_matches":scores["baseline"]["exact_matches"],
                "candidate_exact_matches":scores["candidate"]["exact_matches"],
                "baseline_generation_diagnostics":summarize_generation_diagnostics_v1(scores["baseline"]["details"]),
                "candidate_generation_diagnostics":summarize_generation_diagnostics_v1(scores["candidate"]["details"]),
                "candidate_min_length_8_diagnostics":summarize_generation_diagnostics_v1(min_length_details),
                "candidate_min_visible_8_diagnostics":summarize_generation_diagnostics_v1(visible_details),
                "candidate_visible_first_diagnostics":summarize_generation_diagnostics_v1(visible_first_details),
                "candidate_context_attribution":context_attribution,
                "candidate_hidden_contribution":hidden_contribution,
                "candidate_token_choice_diagnostics":{
                    "cases":len(token_choice_diagnostics),
                    "steps_per_case":32,
                    "eos_preferred_steps":sum(d["eos_preferred_steps"] for d in token_choice_diagnostics),
                    "whitespace_token_steps":sum(d["whitespace_token_steps"] for d in token_choice_diagnostics),
                    "printable_token_steps":sum(d["printable_token_steps"] for d in token_choice_diagnostics),
                    "non_rendering_token_steps":sum(d["non_rendering_token_steps"] for d in token_choice_diagnostics),
                    "control_or_replacement_token_steps":sum(d["control_or_replacement_token_steps"] for d in token_choice_diagnostics),
                    "raw_text_exposed":False,
                    "raw_token_ids_exposed":False,
                },
            }
        baseline_accepted=sum(row["baseline_accepted"] for row in benchmarks.values())
        candidate_accepted=sum(row["candidate_accepted"] for row in benchmarks.values())
        benchmark_cases=sum(row["cases"] for row in benchmarks.values())
        generation_collapse_detected=any(
            row["candidate_generation_diagnostics"]["empty_responses"] >
            row["baseline_generation_diagnostics"]["empty_responses"]
            or (
                row["candidate_generation_diagnostics"]["distinct_normalized_responses"] <
                row["baseline_generation_diagnostics"]["distinct_normalized_responses"]
                and row["candidate_generation_diagnostics"]["all_responses_identical"]
                and not row["baseline_generation_diagnostics"]["all_responses_identical"]
            )
            for row in benchmarks.values()
        )
        observed_generalization_gain=candidate_accepted>baseline_accepted
        return {
            "training_target_distribution":training_target_distribution,
            "baseline_output_bias_audit":baseline_output_bias_audit,
            "candidate_output_bias_audit":candidate_output_bias_audit,
            "generation_collapse_detected":generation_collapse_detected,
            "candidate_safe_for_review":not generation_collapse_detected and observed_generalization_gain,
            "holdout_cases":benchmark_cases,
            "holdout_baseline_accepted":baseline_accepted,
            "holdout_candidate_accepted":candidate_accepted,
            "holdout_acceptance_delta":candidate_accepted-baseline_accepted,
            "observed_generalization_gain":observed_generalization_gain,
            "feedback_loss_improved":report["feedback_loss_after"]<report["feedback_loss_before"],
            "release_evidence_sufficient":False,
            "candidate_quality_gate_passed":not generation_collapse_detected and observed_generalization_gain and all(
                row["candidate_accepted"]>=row["baseline_accepted"]
                for row in benchmarks.values()),
            "quality_gate_reasons":(["generation_collapse_detected"] if generation_collapse_detected else [])
                + ([] if observed_generalization_gain else ["no_holdout_acceptance_gain"])
                + (["holdout_regression"] if any(
                    row["candidate_accepted"]<row["baseline_accepted"]
                    for row in benchmarks.values()) else []),
            "contract":"future-xsus-core.synthetic-feedback-experiment.v1",
            "synthetic_feedback_only":True,
            "real_neural_training":True,
            "real_benchmark_scoring":True,
            "independent_production_quality_proven":False,
            "feedback_loss_before":report["feedback_loss_before"],
            "feedback_loss_after":report["feedback_loss_after"],
            "feedback_loss_delta":round(report["feedback_loss_after"]-report["feedback_loss_before"],8),
            "benchmarks":benchmarks,
            "candidate_eligible_for_review":result["candidate_eligible_for_review"],
            "human_release_required":True,
            "production_deployed":False,
        }


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",required=True,type=Path)
    args=parser.parse_args()
    result=run_synthetic_feedback_experiment_v1()
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps(result,indent=2,sort_keys=True))


if __name__=="__main__":
    main()
