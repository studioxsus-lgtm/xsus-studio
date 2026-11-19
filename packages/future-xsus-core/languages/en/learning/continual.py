"""Build warm-started English candidates and gate them on private feedback and public holdouts."""

from collections import Counter
import json
from math import isfinite
import os
from pathlib import Path
from random import Random
from tempfile import NamedTemporaryFile

from languages.en.data.preparation.corpus import Example, load_corpus, validate_splits
from languages.en.evaluation.compare import compare_checkpoint, load_cases
from languages.en.learning.feedback_store import FeedbackRecord, SQLiteFeedbackStore
from languages.en.models.checkpoint import load_checkpoint, save_checkpoint
from languages.en.text.normalization.model_input import prepare_model_input
from languages.en.text.tokenizer import BytePairTokenizer
from languages.en.training.train import _encode, _mean_loss, _prepare_examples


def promotion_decision(
    baseline_scores: dict[str, dict],
    candidate_scores: dict[str, dict],
    *,
    feedback_loss_before: float,
    feedback_loss_after: float,
) -> dict:
    """Return an explainable non-regression and feedback-learning gate."""
    reasons = []
    for benchmark in sorted(baseline_scores):
        baseline = baseline_scores[benchmark]
        candidate = candidate_scores.get(benchmark)
        if candidate is None:
            reasons.append(f"missing_candidate_benchmark:{benchmark}")
            continue
        if baseline.get("cases") != candidate.get("cases"):
            reasons.append(f"benchmark_case_count_changed:{benchmark}")
        for metric in ("accepted", "preserved_all_facts"):
            if candidate.get(metric, -1) < baseline.get(metric, 0):
                reasons.append(f"benchmark_regression:{benchmark}:{metric}")
    if not isfinite(feedback_loss_before) or not isfinite(feedback_loss_after):
        reasons.append("feedback_loss_not_finite")
    elif feedback_loss_after >= feedback_loss_before - 1e-6:
        reasons.append("held_out_feedback_loss_did_not_improve")
    return {"eligible_for_promotion": not reasons, "reasons": reasons, "requires_human_release": True}


def _normalized_key(example: Example) -> tuple[str, tuple[tuple[str, str], ...]]:
    conversation = example.conversation
    return (
        " ".join(conversation.text.casefold().split()),
        tuple((turn.role.value, " ".join(turn.text.casefold().split())) for turn in conversation.history),
    )


def _reject_conflicting_feedback(records: tuple[FeedbackRecord, ...]) -> None:
    targets: dict[tuple, set[str]] = {}
    for record in records:
        targets.setdefault(_normalized_key(record.example), set()).add(" ".join(record.example.response.casefold().split()))
    if any(len(responses) > 1 for responses in targets.values()):
        raise ValueError("Approved feedback contains conflicting responses for the same conversation")


def _loss(tokenizer: BytePairTokenizer, model, examples: tuple[Example, ...]) -> float:
    prepared = _prepare_examples(examples, model.prompt_format)
    encoded = _encode(tokenizer, prepared)
    return _mean_loss(model, encoded)


def _write_report(path: Path, report: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False).encode("utf-8")
    with NamedTemporaryFile(dir=path.parent, delete=False) as temporary:
        temporary_path = Path(temporary.name)
        try:
            temporary.write(data)
            temporary.flush()
            os.fsync(temporary.fileno())
            temporary.close()
            os.replace(temporary_path, path)
        finally:
            temporary_path.unlink(missing_ok=True)


def build_candidate(
    store: SQLiteFeedbackStore,
    owner_id: str,
    *,
    baseline_path: Path,
    training_path: Path,
    evaluation_paths: dict[str, Path],
    candidate_path: Path,
    report_path: Path,
    seed: int = 23,
    epochs: int = 1,
    learning_rate: float = 0.008,
    replay_examples: int = 96,
) -> dict:
    """Train from a signed-off baseline, retain replay data, evaluate, and write a gated candidate."""
    if type(epochs) is not int or not 1 <= epochs <= 32:
        raise ValueError("epochs must be an integer between 1 and 32")
    if not isfinite(learning_rate) or not 0 < learning_rate <= 0.1:
        raise ValueError("learning_rate must be finite and between 0 and 0.1")
    if type(replay_examples) is not int or not 1 <= replay_examples <= 4096:
        raise ValueError("replay_examples must be an integer between 1 and 4096")
    if type(seed) is not int:
        raise ValueError("seed must be an integer")
    paths = {
        path.resolve()
        for path in (store.path, baseline_path, training_path, *evaluation_paths.values())
    }
    if candidate_path.resolve() in paths or report_path.resolve() in paths or candidate_path.resolve() == report_path.resolve():
        raise ValueError("Candidate and report outputs must be separate from source artifacts")
    required = {"written-v4", "written-v5"}
    if set(evaluation_paths) != required:
        raise ValueError("Both written-v4 and written-v5 holdout benchmarks are required")

    records = store.accepted(owner_id)
    if len(records) < 5:
        raise ValueError("At least five consented, human-approved examples are required for a learning cycle")
    _reject_conflicting_feedback(records)
    ordered = sorted(records, key=lambda record: record.example_id)
    holdout_count = max(1, len(ordered) // 5)
    feedback_holdout = tuple(record.example for record in ordered[:holdout_count])
    feedback_train = tuple(record.example for record in ordered[holdout_count:])

    training = load_corpus(training_path)
    benchmark_cases = {name: load_cases(path) for name, path in evaluation_paths.items()}
    for cases in benchmark_cases.values():
        validate_splits(training, tuple(case.example for case in cases))
        validate_splits(tuple(record.example for record in ordered), tuple(case.example for case in cases))
    validate_splits(feedback_train, feedback_holdout)
    validate_splits(training, tuple(record.example for record in ordered))

    tokenizer, model, baseline_revision = load_checkpoint(baseline_path)
    feedback_loss_before = _loss(tokenizer, model, feedback_holdout)
    baseline_scores = {
        name: compare_checkpoint(baseline_path, cases)
        for name, cases in benchmark_cases.items()
    }

    prepared_replay = list(_prepare_examples(training, model.prompt_format))
    rng = Random(seed)
    rng.shuffle(prepared_replay)
    frequencies: Counter[Example] = Counter()
    replay = []
    for example in prepared_replay:
        if frequencies[example] == 0:
            replay.append(example)
            frequencies[example] += 1
            if len(replay) >= replay_examples:
                break
    prepared_feedback = _prepare_examples(feedback_train, model.prompt_format)
    train_examples = [*replay, *prepared_feedback]
    if not train_examples:
        raise ValueError("No examples remain for the learning update")
    encoded = _encode(tokenizer, tuple(train_examples))
    for _ in range(epochs):
        rng.shuffle(encoded)
        for prompt, targets in encoded:
            prefix = prompt.copy()
            for target in targets:
                model.train_step(prefix, target, learning_rate)
                prefix.append(target)

    candidate_path.parent.mkdir(parents=True, exist_ok=True)
    save_checkpoint(candidate_path, tokenizer, model)
    candidate_tokenizer, candidate_model, candidate_revision = load_checkpoint(candidate_path)
    feedback_loss_after = _loss(candidate_tokenizer, candidate_model, feedback_holdout)
    candidate_scores = {
        name: compare_checkpoint(candidate_path, cases)
        for name, cases in benchmark_cases.items()
    }
    gate = promotion_decision(
        baseline_scores, candidate_scores,
        feedback_loss_before=feedback_loss_before,
        feedback_loss_after=feedback_loss_after,
    )
    report = {
        "format": "xsus-en-learning-report-v1",
        "baseline_revision": baseline_revision,
        "candidate_revision": candidate_revision,
        "approved_feedback_examples": len(records),
        "feedback_training_examples": len(feedback_train),
        "feedback_holdout_examples": len(feedback_holdout),
        "replay_examples": len(replay),
        "epochs": epochs,
        "learning_rate": learning_rate,
        "feedback_loss_before": round(feedback_loss_before, 8),
        "feedback_loss_after": round(feedback_loss_after, 8),
        "benchmarks": {
            name: {"baseline": baseline_scores[name], "candidate": candidate_scores[name]}
            for name in sorted(required)
        },
        **gate,
    }
    _write_report(report_path, report)
    return report
