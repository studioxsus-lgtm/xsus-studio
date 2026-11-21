"""Read-only checkpoint benchmark with explicit conversation-overlap checks.

Conversation disjointness is verified against supplied corpora only; it cannot
establish the provenance of a checkpoint or exclude unseen training data.
"""
import hashlib
from pathlib import Path

from languages.en.data.preparation.corpus import load_corpus, validate_splits
from languages.en.evaluation.compare import load_cases
from languages.en.models.checkpoint import load_checkpoint
from languages.en.evaluation.checkpoint_generation_holdout_v1 import (
    inspect_checkpoint_generation_holdout_v1,
)


def _digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inspect_verified_checkpoint_holdout_v1(
    checkpoint_path, training_paths, evaluation_path, *, max_new_tokens=32,
):
    if type(max_new_tokens) is not int or not 1 <= max_new_tokens <= 256:
        raise ValueError("invalid generation length")
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
    # Each individual corpus must remain internally unique. Across versioned
    # corpora, repeated conversations are expected and are counted only once.
    # This is a split check, not a guarantee of checkpoint training provenance.
    training_by_key = {}
    for path in training_paths:
        corpus = load_corpus(path)
        validate_splits(corpus, ())
        for example in corpus:
            conversation = example.conversation
            key = (
                " ".join(conversation.text.casefold().split()),
                tuple((turn.role, " ".join(turn.text.casefold().split()))
                      for turn in conversation.history),
            )
            training_by_key.setdefault(key, example)
    validate_splits(tuple(training_by_key.values()),
                    tuple(case.example for case in cases))
    prompts = [case.example.conversation for case in cases]
    references = [case.example.response for case in cases]
    tokenizer, _, _ = load_checkpoint(checkpoint_path)
    # A reference longer than the generation budget cannot match in full.
    # Report this limitation without retaining or returning raw text.
    references_exceeding_budget = sum(
        len(tokenizer.encode(reference)) > max_new_tokens
        for reference in references
    )
    report = inspect_checkpoint_generation_holdout_v1(
        checkpoint_path, prompts, references,
        independent_holdout=True, max_new_tokens=max_new_tokens,
    )
    if tuple(_digest(path) for path in all_paths) != before:
        raise RuntimeError("benchmark input changed during evaluation")
    if report["checkpoint_revision"] != "sha256-" + before[0]:
        raise RuntimeError("loaded checkpoint revision differs from benchmark input")
    return {
        "contract": "future-xsus-core.verified-checkpoint-holdout.v1",
        "cases": len(cases),
        "training_corpora_checked": len(training_paths),
        "unique_training_conversations_checked": len(training_by_key),
        "checked_training_conversation_overlap": True,
        "checkpoint_training_provenance_verified": False,
        "holdout_isolation_scope": "exact normalized conversation keys in supplied corpora only",
        "semantic_contamination_excluded": False,
        "metric_is_full_response_exact_match": True,
        "references_exceeding_generation_budget": references_exceeding_budget,
        "generation_budget_tokens": max_new_tokens,
        "evaluation_sha256": before[1],
        "checkpoint_sha256": before[0],
        "training_sha256": list(before[2:]),
        "result": report,
        "weights_retrained": False,
        "release_authorized": False,
        "raw_text_exposed": False,
    }
