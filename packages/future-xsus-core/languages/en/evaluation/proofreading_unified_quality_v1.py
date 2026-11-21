"""Reverify signed artifacts and category manifest before unified scoring."""
from .proofreading_prediction_artifact_v1 import compare_authenticated_proofreading_artifacts_v1
from .proofreading_category_manifest_v1 import verify_proofreading_category_manifest_v1
from .proofreading_category_quality_v1 import evaluate_proofreading_categories_v1, CategoryThresholdV1


def evaluate_proofreading_unified_quality_v1(
    comparison, manifest, secret_key, *, thresholds=None,
    default_threshold=CategoryThresholdV1(), max_regressions=0, min_improvements=0
):
    if (type(comparison) is not dict
            or comparison.get("contract") != "future-xsus-core.proofreading-snapshot-comparison.v1"
            or comparison.get("single_snapshot_used") is not True
            or comparison.get("trusted_digest_checked") is not True):
        raise ValueError("Trusted snapshot comparison required")
    categories = verify_proofreading_category_manifest_v1(manifest, secret_key)
    reference = comparison["reference_artifact"]
    baseline = comparison["baseline_artifact"]
    candidate = comparison["candidate_artifact"]
    authenticated = compare_authenticated_proofreading_artifacts_v1(
        reference, baseline, candidate, secret_key,
        max_regressions=max_regressions, min_improvements=min_improvements,
    )
    if authenticated["dataset_sha256"] != manifest["dataset_sha256"]:
        raise ValueError("Category manifest dataset mismatch")
    # Do not reuse caller-provided metrics or claimed signature-verification flags.
    trusted_comparison = {
        **authenticated,
        "contract": "future-xsus-core.proofreading-snapshot-comparison.v1",
        "single_snapshot_used": True,
        "trusted_digest_checked": True,
        "reference_artifact": reference,
        "baseline_artifact": baseline,
        "candidate_artifact": candidate,
    }
    category_report = evaluate_proofreading_categories_v1(
        trusted_comparison, categories, thresholds=thresholds,
        default_threshold=default_threshold,
    )
    return {
        "contract": "future-xsus-core.proofreading-unified-quality.v1",
        "dataset_sha256": authenticated["dataset_sha256"],
        "case_count": authenticated["case_count"],
        "baseline_accuracy": authenticated["baseline_accuracy"],
        "candidate_accuracy": authenticated["candidate_accuracy"],
        "improvements": authenticated["improvements"],
        "regressions": authenticated["regressions"],
        "overall_passed": authenticated["passed"],
        "categories": category_report["categories"],
        "category_passed": category_report["passed"],
        "passed": authenticated["passed"] and category_report["passed"],
        "artifacts_authenticated_at_check": True,
        "category_manifest_authenticated_at_check": True,
        "dataset_origin_independently_attested": False,
        "model_execution_attested": False,
        "release_authorized": False,
    }
