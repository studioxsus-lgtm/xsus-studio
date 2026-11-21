"""Read-only checkpoint benchmark with explicit conversation-overlap checks.

Conversation disjointness is verified against supplied corpora only; it cannot
establish the provenance of a checkpoint or exclude unseen training data.
"""
import hashlib
from pathlib import Path

from languages.en.data.preparation.corpus import load_corpus, validate_splits
from languages.en.evaluation.compare import load_cases
from languages.en.evaluation.checkpoint_generation_holdout_v1 import (
    inspect_checkpoint_generation_holdout_v1,
)


def _digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inspect_verified_checkpoint_holdout_v1(
    checkpoint_path, training_paths, evaluation_path, *, max_new_tokens=32,
):
    checkpoint_path = Path(checkpoint_path)
    evaluation_path = Path(evaluation_path)
    if not isinstance(training_paths, (list, tuple)) or not training_paths:
        raise ValueError("at least one training corpus is required")
    training_paths = tuple(Path(path) for path in training_paths)
    all_paths = (checkpoint_path, evaluation_path, *training_paths)
    if len({path.resolve() for path in all_paths}) != len(all_paths):
        raise ValueError("checkpoint, evaluation, and training paths must be distinct")
    before = tuple(_digest(path) for path in all_paths)
    cases = load_cases(evaluation_path)
    training = tuple(
        example for path in training_paths for example in load_corpus(path)
    )
    validate_splits(training, tuple(case.example for case in cases))
    prompts = [case.example.conversation.text for case in cases]
    if any(case.example.conversation.history for case in cases):
        raise ValueError("history-bearing holdout cases require conversation-aware encoding")
    references = [case.example.response for case in cases]
    report = inspect_checkpoint_generation_holdout_v1(
        checkpoint_path, prompts, references,
        independent_holdout=True, max_new_tokens=max_new_tokens,
    )
    if tuple(_digest(path) for path in all_paths) != before:
        raise RuntimeError("benchmark input changed during evaluation")
    return {
        "contract": "future-xsus-core.verified-checkpoint-holdout.v1",
        "cases": len(cases),
        "training_corpora_checked": len(training_paths),
        "checked_training_conversation_overlap": True,
        "checkpoint_training_provenance_verified": False,
        "evaluation_sha256": before[1],
        "checkpoint_sha256": before[0],
        "training_sha256": list(before[2:]),
        "result": report,
        "weights_retrained": False,
        "release_authorized": False,
        "raw_text_exposed": False,
    }
