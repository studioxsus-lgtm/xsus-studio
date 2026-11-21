"""Canonical, HMAC-authenticated proofreading prediction snapshots.

Signing authenticates a trusted publisher's bytes, not the actual model
origin, the dataset's secrecy, or the correctness of its labels.
"""
from hashlib import sha256
import hmac
import json
import re

from .proofreading_regression_comparison_v1 import (
    ProofreadingPredictionV1, compare_proofreading_versions_v1,
)

_HEX64 = re.compile(r"[0-9a-f]{64}\Z")
_CONTRACT = "future-xsus-core.proofreading-prediction-artifact.v1"
_STATUSES = frozenset(("corrected", "partial", "unchanged", "review_required"))


def _key(secret_key):
    if type(secret_key) is not bytes or len(secret_key) < 32:
        raise ValueError("Signing key must contain at least 32 bytes")


def _digest(value):
    if type(value) is not str or not _HEX64.fullmatch(value):
        raise ValueError("Lowercase SHA-256 required")
    return value


def _canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def _predictions(items):
    if type(items) not in (tuple, list) or not 1 <= len(items) <= 10000:
        raise ValueError("Nonempty bounded predictions required")
    result = []
    seen = set()
    for item in items:
        if (not isinstance(item, ProofreadingPredictionV1)
                or type(item.case_id) is not str or not 1 <= len(item.case_id) <= 128
                or item.case_id in seen or type(item.status) is not str
                or item.status not in _STATUSES or type(item.output) is not str
                or len(item.output) > 100000):
            raise ValueError("Invalid or duplicate prediction")
        seen.add(item.case_id)
        result.append({"case_id": item.case_id, "status": item.status, "output": item.output})
    return sorted(result, key=lambda x: x["case_id"])


def create_proofreading_prediction_artifact_v1(
    version, dataset_sha256, predictions, secret_key
):
    _key(secret_key)
    _digest(dataset_sha256)
    if type(version) is not str or not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}", version):
        raise ValueError("Invalid version label")
    payload = {
        "contract": _CONTRACT, "version": version,
        "dataset_sha256": dataset_sha256,
        "predictions": _predictions(predictions),
        "release_authorized": False,
    }
    signature = hmac.new(secret_key, _canonical(payload), sha256).hexdigest()
    return {**payload, "signature": signature}


def verify_proofreading_prediction_artifact_v1(artifact, secret_key):
    _key(secret_key)
    if type(artifact) is not dict or set(artifact) != {
        "contract", "version", "dataset_sha256", "predictions",
        "release_authorized", "signature"
    }:
        raise ValueError("Invalid artifact schema")
    if artifact["contract"] != _CONTRACT or artifact["release_authorized"] is not False:
        raise ValueError("Invalid artifact contract")
    signature = _digest(artifact["signature"])
    expected_payload = create_proofreading_prediction_artifact_v1(
        artifact["version"], artifact["dataset_sha256"],
        [ProofreadingPredictionV1(**item) for item in artifact["predictions"]], secret_key
    )
    if artifact["predictions"] != expected_payload["predictions"]:
        raise ValueError("Noncanonical prediction ordering")
    if not hmac.compare_digest(signature, expected_payload["signature"]):
        raise ValueError("Artifact signature invalid")
    return tuple(ProofreadingPredictionV1(**item) for item in artifact["predictions"])


def compare_authenticated_proofreading_artifacts_v1(
    reference_artifact, baseline_artifact, candidate_artifact, secret_key, *,
    max_regressions=0, min_improvements=0,
):
    reference = verify_proofreading_prediction_artifact_v1(reference_artifact, secret_key)
    baseline = verify_proofreading_prediction_artifact_v1(baseline_artifact, secret_key)
    candidate = verify_proofreading_prediction_artifact_v1(candidate_artifact, secret_key)
    dataset = reference_artifact["dataset_sha256"]
    if baseline_artifact["dataset_sha256"] != dataset or candidate_artifact["dataset_sha256"] != dataset:
        raise ValueError("Dataset fingerprints differ")
    if len({reference_artifact["version"], baseline_artifact["version"],
            candidate_artifact["version"]}) != 3:
        raise ValueError("Distinct version labels required")
    result = compare_proofreading_versions_v1(
        reference, baseline, candidate, dataset_sha256=dataset,
        max_regressions=max_regressions, min_improvements=min_improvements,
    )
    return {
        **result, "contract": "future-xsus-core.authenticated-proofreading-comparison.v1",
        "artifacts_authenticated_at_check": True,
        "publisher_identity_verified": False,
        "model_execution_proven": False,
        "release_authorized": False,
    }
