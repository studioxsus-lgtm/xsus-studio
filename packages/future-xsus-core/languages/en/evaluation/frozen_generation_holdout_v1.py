"""Run a frozen, deterministic greedy-generation holdout across context windows.

No training, no production mutation, and no raw prompts or generations in reports.
This is an exact-match diagnostic, not proof of semantic quality.
"""
from copy import deepcopy
from math import isfinite
from languages.en.text.tokenizer import BYTE_OFFSET, EOS
from languages.en.evaluation.generation_quality_scoring_v1 import inspect_generation_quality_scoring_v1


def inspect_frozen_generation_holdout_v1(tokenizer, model, prefixes, references, *,
                                         independent_holdout=False, max_new_tokens=32):
    if independent_holdout is not True:
        raise ValueError("independent holdout confirmation required")
    if type(max_new_tokens) is not int or not 1 <= max_new_tokens <= 256:
        raise ValueError("invalid generation length")
    if not isinstance(prefixes, (list, tuple)) or not isinstance(references, (list, tuple)):
        raise ValueError("prefixes and references must be sequences")
    if len(prefixes) != len(references) or len(prefixes) < 2:
        raise ValueError("at least two aligned cases required")
    if any(not isinstance(prefix, (list, tuple)) or
           any(type(token) is not int or not 0 <= token < tokenizer.vocab_size for token in prefix)
           for prefix in prefixes):
        raise ValueError("invalid encoded prefix")
    if model.vocab_size != tokenizer.vocab_size:
        raise ValueError("model and tokenizer vocabulary mismatch")
    snapshot = deepcopy(model)
    generations = {}
    for size in (16, 32, 64):
        frozen = deepcopy(snapshot)
        frozen.context_size = size
        texts = []
        for prefix in prefixes:
            tokens = list(prefix)
            output = []
            for _ in range(max_new_tokens):
                logits = frozen.logits(tokens)
                if len(logits) != frozen.vocab_size or any(
                    type(value) not in (int, float) or not isfinite(value) for value in logits
                ):
                    raise ValueError("invalid generation logits")
                # EOS is the only special token eligible for decoding termination.
                candidates = [EOS] + list(range(BYTE_OFFSET, frozen.vocab_size))
                winner = max(candidates, key=lambda token: (logits[token], -token))
                if winner == EOS:
                    break
                output.append(winner)
                tokens.append(winner)
            texts.append(tokenizer.decode(output, errors="replace"))
        generations[str(size)] = texts
    if model != snapshot:
        raise ValueError("frozen model was mutated during evaluation")
    result = inspect_generation_quality_scoring_v1(
        references, generations, independent_holdout=True, weights_retrained=False
    )
    return {
        "contract": "future-xsus-core.frozen-generation-holdout.v1",
        "cases": len(prefixes),
        "max_new_tokens": max_new_tokens,
        "trained_context_size": model.context_size,
        "scoring": result,
        "weights_retrained": False,
        "production_context_changed": False,
        "release_authorized": False,
        "raw_text_exposed": False,
        "raw_token_ids_exposed": False,
        "raw_logits_exposed": False,
    }
