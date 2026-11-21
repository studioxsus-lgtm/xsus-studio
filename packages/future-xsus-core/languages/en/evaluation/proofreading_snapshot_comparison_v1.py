"""Compare two proofreading engines over one validated dataset snapshot."""
from pathlib import Path

from ..text.editing.proofreader import proofread_sentence
from .proofreading_dataset_snapshot_v1 import (
    load_proofreading_dataset_snapshot_v1,
    verify_proofreading_dataset_snapshot_v1,
)
from .proofreading_prediction_artifact_v1 import (
    create_proofreading_prediction_artifact_v1,
    compare_authenticated_proofreading_artifacts_v1,
)
from .proofreading_regression_comparison_v1 import ProofreadingPredictionV1


def compare_proofreading_snapshot_v1(
    path, trusted_sha256, secret_key, *,
    baseline_engine=proofread_sentence,
    candidate_engine=proofread_sentence,
    max_cases=1000, max_regressions=0, min_improvements=0,
):
    if not callable(baseline_engine) or not callable(candidate_engine):
        raise ValueError("Both engines must be callable")
    snapshot = load_proofreading_dataset_snapshot_v1(path, max_cases=max_cases)
    verify_proofreading_dataset_snapshot_v1(snapshot, trusted_sha256)
    reference = []
    baseline = []
    candidate = []
    for case_id, source, expected_status, expected_text in snapshot.rows:
        reference.append(ProofreadingPredictionV1(case_id, expected_status, expected_text))
        for engine, target in ((baseline_engine, baseline), (candidate_engine, candidate)):
            observed = engine(source)
            if not isinstance(observed.status, str) or type(observed.text) is not str:
                raise ValueError("Invalid engine response")
            target.append(ProofreadingPredictionV1(case_id, str(observed.status), observed.text))
    def signed(version, predictions):
        return create_proofreading_prediction_artifact_v1(
            version, snapshot.digest, predictions, secret_key
        )
    reference_artifact = signed("reference", reference)
    baseline_artifact = signed("baseline", baseline)
    candidate_artifact = signed("candidate", candidate)
    report = compare_authenticated_proofreading_artifacts_v1(
        reference_artifact, baseline_artifact, candidate_artifact, secret_key,
        max_regressions=max_regressions, min_improvements=min_improvements,
    )
    return {
        **report,
        "contract": "future-xsus-core.proofreading-snapshot-comparison.v1",
        "reference_artifact": reference_artifact,
        "baseline_artifact": baseline_artifact,
        "candidate_artifact": candidate_artifact,
        "single_snapshot_used": True,
        "trusted_digest_checked": True,
        "model_identity_attested": False,
        "reference_label_independence_proven": False,
        "release_authorized": False,
    }
