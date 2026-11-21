"""Run baseline and candidate proofreaders and compare signed observations."""
import json
from pathlib import Path

from ..text.editing.proofreader import proofread_sentence
from .proofreading_execution_capture_v1 import capture_proofreading_execution_v1
from .proofreading_prediction_artifact_v1 import (
    create_proofreading_prediction_artifact_v1,
    compare_authenticated_proofreading_artifacts_v1,
)
from .proofreading_regression_comparison_v1 import ProofreadingPredictionV1


def compare_proofreading_executions_v1(
    path, secret_key, *, baseline_engine=proofread_sentence,
    candidate_engine=proofread_sentence, max_cases=1000,
    max_regressions=0, min_improvements=0,
):
    if not isinstance(path, Path):
        raise ValueError("Path required")
    if not callable(baseline_engine) or not callable(candidate_engine):
        raise ValueError("Both engines must be callable")
    # Capture validates dataset records and fingerprints exact file bytes.
    baseline = capture_proofreading_execution_v1(
        path, "baseline", secret_key, engine=baseline_engine, max_cases=max_cases
    )
    candidate = capture_proofreading_execution_v1(
        path, "candidate", secret_key, engine=candidate_engine, max_cases=max_cases
    )
    if baseline["artifact"]["dataset_sha256"] != candidate["artifact"]["dataset_sha256"]:
        raise ValueError("Dataset changed between executions")
    raw = path.read_bytes()
    from hashlib import sha256
    if sha256(raw).hexdigest() != baseline["artifact"]["dataset_sha256"]:
        raise ValueError("Dataset changed before reference capture")
    labels = []
    for line in raw.decode("utf-8").splitlines():
        row = json.loads(line)
        labels.append(ProofreadingPredictionV1(row["id"], row["status"], row["output"]))
    reference = create_proofreading_prediction_artifact_v1(
        "reference", baseline["artifact"]["dataset_sha256"], labels, secret_key
    )
    comparison = compare_authenticated_proofreading_artifacts_v1(
        reference, baseline["artifact"], candidate["artifact"], secret_key,
        max_regressions=max_regressions, min_improvements=min_improvements,
    )
    return {
        **comparison,
        "contract": "future-xsus-core.proofreading-execution-comparison.v1",
        "baseline_artifact": baseline["artifact"],
        "candidate_artifact": candidate["artifact"],
        "reference_artifact": reference,
        "in_process_execution_observed": True,
        "model_identity_attested": False,
        "dataset_secrecy_verified": False,
        "release_authorized": False,
    }
