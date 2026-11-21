"""Capture actual proofreading calls over fixed, labeled JSONL input.

This records in-process observations. It is not a remote attestation.
"""
from hashlib import sha256
import json
from pathlib import Path

from ..text.editing.proofreader import proofread_sentence
from .proofreading_prediction_artifact_v1 import (
    create_proofreading_prediction_artifact_v1,
)
from .proofreading_regression_comparison_v1 import ProofreadingPredictionV1


def capture_proofreading_execution_v1(
    path, version, secret_key, *, engine=proofread_sentence, max_cases=1000
):
    if not isinstance(path, Path):
        raise ValueError("Path required")
    if type(max_cases) is not int or not 1 <= max_cases <= 10000:
        raise ValueError("Invalid case limit")
    if not callable(engine):
        raise ValueError("Callable engine required")
    raw = path.read_bytes()
    if not raw or len(raw) > 2_000_000:
        raise ValueError("Empty or oversized dataset")
    try:
        content = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("UTF-8 dataset required") from exc
    predictions = []
    seen = set()
    for line in content.splitlines():
        if not line.strip():
            raise ValueError("Blank dataset lines forbidden")
        try:
            record = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError("Malformed dataset") from exc
        if (type(record) is not dict or set(record) != {"id", "input", "status", "output"}
                or any(type(record[k]) is not str for k in record)
                or not 1 <= len(record["id"]) <= 128 or record["id"] in seen
                or not 1 <= len(record["input"]) <= 100000):
            raise ValueError("Invalid or duplicate dataset record")
        seen.add(record["id"])
        if len(seen) > max_cases:
            raise ValueError("Case limit exceeded")
        # Labels are deliberately not passed to the engine.
        observed = engine(record["input"])
        if (type(observed.status) is not str or type(observed.text) is not str):
            raise ValueError("Engine result fields must be strings")
        predictions.append(ProofreadingPredictionV1(
            record["id"], observed.status, observed.text
        ))
    artifact = create_proofreading_prediction_artifact_v1(
        version, sha256(raw).hexdigest(), predictions, secret_key
    )
    return {
        "contract": "future-xsus-core.proofreading-execution-capture.v1",
        "artifact": artifact,
        "executed_case_count": len(predictions),
        "execution_observed_in_process": True,
        "engine_identity_attested": False,
        "labels_used_for_inference": False,
        "release_authorized": False,
    }
