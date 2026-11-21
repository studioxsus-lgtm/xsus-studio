"""Evaluate separately labeled English proofreading holdout without training."""
from hashlib import sha256
from pathlib import Path

from .proofreading_quality_gate_v1 import (
    ProofreadingThresholdsV1, evaluate_proofreading_quality_gate_v1,
)

_HOLDOUT = Path(__file__).with_name("proofreading-independent-holdout-v1.jsonl")


def evaluate_independent_proofreading_holdout_v1(
    *, path=_HOLDOUT, thresholds=ProofreadingThresholdsV1(15, 0.95, 0)
):
    if not isinstance(path, Path):
        raise ValueError("Path required")
    raw = path.read_bytes()
    if len(raw) > 2_000_000:
        raise ValueError("Holdout too large")
    report = evaluate_proofreading_quality_gate_v1(path, thresholds=thresholds)
    return {
        **report,
        "contract": "future-xsus-core.english-independent-proofreading-holdout.v1",
        "dataset_sha256": sha256(raw).hexdigest(),
        "labels_derived_from_engine": False,
        "holdout_secrecy_guaranteed": False,
        "generalization_verified": False,
        "release_authorized": False,
    }
