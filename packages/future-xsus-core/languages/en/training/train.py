"""Train and evaluate the first XSUS English model from random weights."""

import argparse
import json
from math import isfinite
from pathlib import Path
from random import Random

from ..data.preparation.corpus import Example, load_corpus, validate_splits
from ..models.checkpoint import load_checkpoint, save_checkpoint
from ..models.neural_model import NeuralLanguageModel
from ..text.generation.conversation_format import prompt_tokens
from ..text.generation.generate import generate
from ..text.normalization.rewrite_slots import prepare_rewrite
from ..text.tokenizer import EOS, BytePairTokenizer

_ROOT = Path(__file__).resolve().parents[1]
_EncodedExample = tuple[list[int], list[int]]


def _mask_examples(examples: tuple[Example, ...]) -> tuple[Example, ...]:
    normalized = []
    for example in examples:
        rewrite = prepare_rewrite(example.conversation)
        if rewrite is not None:
            response = rewrite.mask(example.response)
            if all(response.count(marker) == 1 for marker, _ in rewrite.slots):
                example = Example(rewrite.prompt, response)
        normalized.append(example)
    return tuple(normalized)


def _encode(tokenizer: BytePairTokenizer, examples: tuple[Example, ...]) -> list[_EncodedExample]:
    return [
        (prompt_tokens(tokenizer, example.conversation), [*tokenizer.encode(example.response), EOS])
        for example in examples
    ]


def _mean_loss(model: NeuralLanguageModel, examples: list[_EncodedExample]) -> float:
    loss = 0.0
    count = 0
    for prompt, targets in examples:
        prefix = prompt.copy()
        for target in targets:
            loss += model.loss(prefix, target)
            count += 1
            prefix.append(target)
    return loss / count


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--training", type=Path, default=_ROOT / "data" / "training.jsonl")
    parser.add_argument("--evaluation", type=Path, default=_ROOT / "evaluation" / "conversation.jsonl")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--seed", type=int, default=23)
    parser.add_argument("--merges", type=int, default=96)
    parser.add_argument("--hidden-size", type=int, default=16)
    parser.add_argument("--context-size", type=int, default=32)
    parser.add_argument("--epochs", type=int, default=32)
    parser.add_argument("--learning-rate", type=float, default=0.055)
    parser.add_argument("--copy-rewrite-slots", action="store_true")
    args = parser.parse_args()
    if args.epochs < 1 or not isfinite(args.learning_rate) or args.learning_rate <= 0:
        parser.error("epochs and learning rate must be positive and finite")
    if args.output.resolve() in {args.training.resolve(), args.evaluation.resolve()}:
        parser.error("checkpoint output must differ from both corpus files")
    training = load_corpus(args.training)
    evaluation = load_corpus(args.evaluation)
    validate_splits(training, evaluation)
    train_for_model = _mask_examples(training) if args.copy_rewrite_slots else training
    eval_for_model = _mask_examples(evaluation) if args.copy_rewrite_slots else evaluation
    tokenizer = BytePairTokenizer.train(
        (text for example in train_for_model for text in (
            example.conversation.text, *(turn.text for turn in example.conversation.history), example.response
        )),
        max_merges=args.merges,
    )
    model = NeuralLanguageModel.initialize(
        vocab_size=tokenizer.vocab_size, hidden_size=args.hidden_size,
        context_size=args.context_size, seed=args.seed,
    )
    if args.copy_rewrite_slots:
        model.prompt_format = "rewrite-slots-v1"
    train_encoded = _encode(tokenizer, train_for_model)
    eval_encoded = _encode(tokenizer, eval_for_model)
    initial_train_loss = _mean_loss(model, train_encoded)
    initial_eval_loss = _mean_loss(model, eval_encoded)
    rng = Random(args.seed)
    for _ in range(args.epochs):
        rng.shuffle(train_encoded)
        for prompt, targets in train_encoded:
            prefix = prompt.copy()
            for target in targets:
                model.train_step(prefix, target, args.learning_rate)
                prefix.append(target)
    save_checkpoint(args.output, tokenizer, model)
    tokenizer, model, revision = load_checkpoint(args.output)
    examples = [
        (example, generate(tokenizer, model, example.conversation))
        for example in evaluation
    ]
    print(json.dumps({
        "revision": revision,
        "training_examples": len(training),
        "evaluation_examples": len(evaluation),
        "vocabulary_size": tokenizer.vocab_size,
        "train_loss_before": round(initial_train_loss, 4),
        "train_loss_after": round(_mean_loss(model, train_encoded), 4),
        "held_out_loss_before": round(initial_eval_loss, 4),
        "held_out_loss_after": round(_mean_loss(model, eval_encoded), 4),
        "held_out_exact_matches": sum(generated == example.response for example, generated in examples),
        "held_out_generations": [
            {"prompt": example.conversation.text, "expected": example.response, "generated": generated}
            for example, generated in examples
        ],
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
