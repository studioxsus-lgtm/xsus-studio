"""Autoregressive generation using the XSUS checkpoint."""

from threading import Event
from math import isfinite

from core.contracts.request import Conversation

from ...models.neural_model import NeuralLanguageModel
from ..normalization.model_input import WRITTEN_V5, prepare_model_input
from ..tokenizer import BYTE_OFFSET, EOS, BytePairTokenizer
from .conversation_format import prompt_tokens


def generate(
    tokenizer: BytePairTokenizer,
    model: NeuralLanguageModel,
    conversation: Conversation,
    *,
    max_new_tokens: int | None = None,
    min_new_tokens: int = 0,
    min_visible_chars: int = 0,
    avoid_leading_whitespace: bool = False,
    hidden_contribution_scale: float = 1.0,
    stop: Event | None = None,
) -> str:
    prompt, rewrite = prepare_model_input(conversation, model.prompt_format)
    if max_new_tokens is None:
        lesson = model.prompt_format == WRITTEN_V5 and prompt.text.startswith("Explain writing lesson: ")
        max_new_tokens = 96 if lesson else 64
    if type(max_new_tokens) is not int or max_new_tokens < 1:
        raise ValueError("max_new_tokens must be a positive integer")
    if type(min_new_tokens) is not int or not 0 <= min_new_tokens <= max_new_tokens:
        raise ValueError("min_new_tokens must be an integer between 0 and max_new_tokens")
    if type(min_visible_chars) is not int or not 0 <= min_visible_chars <= max_new_tokens:
        raise ValueError("min_visible_chars must be an integer between 0 and max_new_tokens")
    if type(avoid_leading_whitespace) is not bool:
        raise ValueError("avoid_leading_whitespace must be a boolean")
    if type(hidden_contribution_scale) not in (int,float) or not isfinite(hidden_contribution_scale) or not 0 <= hidden_contribution_scale <= 1:
        raise ValueError("hidden_contribution_scale must be finite and between 0 and 1")
    prefix = prompt_tokens(tokenizer, prompt)[-model.context_size:]
    produced: list[int] = []
    for _ in range(max_new_tokens):
        if stop is not None and stop.is_set():
            break
        if hidden_contribution_scale == 1.0:
            logits = model.logits(prefix)
        else:
            _, hidden, _ = model._forward(prefix)
            logits = [bias + hidden_contribution_scale * sum(weight * value for weight, value in zip(row, hidden))
                      for row, bias in zip(model.output_weights, model.output_bias)]
        candidates = range(BYTE_OFFSET, model.vocab_size)
        if avoid_leading_whitespace and not tokenizer.decode(produced, errors="replace").strip():
            visible_candidates = [token for token in candidates
                if tokenizer.decode([token], errors="replace").strip()]
            if visible_candidates:
                candidates = visible_candidates
        candidate = max(candidates, key=logits.__getitem__)
        visible_enough = min_visible_chars == 0 or len(tokenizer.decode(produced, errors="replace").strip()) >= min_visible_chars
        if len(produced) >= min_new_tokens and visible_enough and logits[EOS] >= logits[candidate]:
            break
        prefix.append(candidate)
        produced.append(candidate)
    generated = tokenizer.decode(produced, errors="replace").strip()
    return rewrite.restore(generated) if rewrite else generated
