"""Opt-in candidate cycle: verify owner feedback, plan, train, then gate; never deploy."""
from dataclasses import dataclass
from pathlib import Path
from .feedback_store import SQLiteFeedbackStore
from .verified_feedback_v1 import VerifiedFeedbackRequestV1, verify_approved_language_feedback_v1
from .continual import build_candidate, feedback_set_revision


@dataclass(frozen=True, slots=True)
class CandidateCycleRequestV1:
    owner_id: str
    domain: str
    baseline_path: Path
    training_path: Path
    evaluation_paths: dict[str, Path]
    candidate_path: Path
    report_path: Path
    seed: int = 23
    epochs: int = 1
    learning_rate: float = 0.008
    replay_examples: int = 96


def _validate_cycle_request(store, request):
    if not isinstance(store, SQLiteFeedbackStore):
        raise ValueError("Persistent SQLiteFeedbackStore required")
    if not isinstance(request, CandidateCycleRequestV1):
        raise ValueError("CandidateCycleRequestV1 required")
    if type(request.owner_id) is not str or not request.owner_id.strip():
        raise ValueError("Owner ID required")
    if type(request.domain) is not str or not request.domain.strip():
        raise ValueError("Language domain required")
    if type(request.evaluation_paths) is not dict or set(request.evaluation_paths)!={"written-v4","written-v5"}:
        raise ValueError("Both independent benchmark paths are required")
    paths=(request.baseline_path,request.training_path,*request.evaluation_paths.values(),
           request.candidate_path,request.report_path)
    if any(not isinstance(p,Path) for p in paths):
        raise ValueError("Paths must be pathlib.Path instances")
    resolved=[p.resolve() for p in (store.path,*paths)]
    if len(set(resolved))!=len(resolved):
        raise ValueError("All input and output paths must be distinct")
    if type(request.epochs) is not int or not 1<=request.epochs<=32:
        raise ValueError("Invalid epoch limit")
    if type(request.replay_examples) is not int or not 1<=request.replay_examples<=4096:
        raise ValueError("Invalid replay limit")
    if type(request.seed) is not int:
        raise ValueError("Invalid seed")
    from math import isfinite
    if type(request.learning_rate) not in (int,float) or not isfinite(request.learning_rate) or not 0<request.learning_rate<=0.1:
        raise ValueError("Invalid learning rate")
    records=store.accepted(request.owner_id)
    if len(records)<5 or len(records)>10000:
        raise ValueError("Between 5 and 10000 approved feedback examples required")
    verified=verify_approved_language_feedback_v1(
        store,VerifiedFeedbackRequestV1(
            request.owner_id,tuple(r.example_id for r in records),request.domain))
    return records,verified


def plan_autonomous_candidate_cycle_v1(store, request):
    """Read-only preflight: no model training or filesystem writes."""
    records,verification=_validate_cycle_request(store,request)
    return {
        "contract":"future-xsus-core.autonomous-candidate-plan.v1",
        "approved_example_count":len(records),
        "feedback_revision":feedback_set_revision(records),
        "domain":verification["domain"],
        "benchmarks":tuple(sorted(request.evaluation_paths)),
        "training_started":False,
        "automatic_activation_authorized":False,
        "human_release_required":True,
        "semantic_correctness_independently_verified":False,
    }


def execute_autonomous_candidate_cycle_v1(store,request,*,approved_execution=False):
    """Train a candidate only with explicit opt-in; release remains prohibited."""
    if approved_execution is not True:
        raise PermissionError("Explicit candidate-training approval required")
    plan=plan_autonomous_candidate_cycle_v1(store,request)
    report=build_candidate(
        store,request.owner_id,baseline_path=request.baseline_path,
        training_path=request.training_path,evaluation_paths=request.evaluation_paths,
        candidate_path=request.candidate_path,report_path=request.report_path,
        seed=request.seed,epochs=request.epochs,learning_rate=request.learning_rate,
        replay_examples=request.replay_examples,
    )
    if type(report) is not dict or report.get("format")!="xsus-en-learning-report-v1":
        raise ValueError("Unexpected candidate training report")
    if report.get("input_sha256",{}).get("approved_feedback_set")!=plan["feedback_revision"]:
        raise ValueError("Approved feedback changed during training")
    return {
        "contract":"future-xsus-core.autonomous-candidate-cycle.v1",
        "plan":plan,
        "candidate_report":report,
        "candidate_eligible_for_review":report.get("eligible_for_promotion") is True,
        "automatic_activation_authorized":False,
        "human_release_required":True,
        "production_deployed":False,
    }
