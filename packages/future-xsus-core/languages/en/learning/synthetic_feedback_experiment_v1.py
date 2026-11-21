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
            "response":f"Curated answer {i}."})+"\n" for i in range(6)),encoding="utf-8")
        for i in range(5):
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
            row={"id":version+"-unseen","prompt":"Explain an independent synthetic topic "+version+".",
                 "response":"An independent reference sentence.",
                 "facts":[],"patterns":["an independent reference sentence\\."]}
            path.write_text(json.dumps(row)+"\n",encoding="utf-8")
            evaluations[version]=path
        request=CandidateCycleRequestV1(
            "synthetic-test-owner","grammar",baseline,training,evaluations,
            root/"candidate.json.gz",root/"report.json",epochs=1,replay_examples=2)
        result=execute_autonomous_candidate_cycle_v1(store,request,approved_execution=True)
        report=result["candidate_report"]
        benchmarks={}
        for name,scores in sorted(report["benchmarks"].items()):
            benchmarks[name]={
                "cases":scores["baseline"]["cases"],
                "baseline_accepted":scores["baseline"]["accepted"],
                "candidate_accepted":scores["candidate"]["accepted"],
                "baseline_exact_matches":scores["baseline"]["exact_matches"],
                "candidate_exact_matches":scores["candidate"]["exact_matches"],
            }
        return {
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
