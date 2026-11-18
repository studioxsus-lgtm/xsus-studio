"""Autoregressive generation using the XSUS checkpoint."""

from threading import Event

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
    stop: Event | None = None,
) -> str:
    prompt, rewrite = prepare_model_input(conversation, model.prompt_format)
    if max_new_tokens is None:
        lesson = model.prompt_format == WRITTEN_V5 and prompt.text.startswith("Explain writing lesson: ")
        max_new_tokens = 96 if lesson else 64
    if type(max_new_tokens) is not int or max_new_tokens < 1:
        raise ValueError("max_new_tokens must be a positive integer")
    prefix = prompt_tokens(tokenizer, prompt)[-model.context_size:]
    produced: list[int] = []
    for _ in range(max_new_tokens):
        if stop is not None and stop.is_set():
            break
        logits = model.logits(prefix)
        candidate = max(range(BYTE_OFFSET, model.vocab_size), key=logits.__getitem__)
        if logits[EOS] >= logits[candidate]:
            break
        prefix.append(candidate)
        produced.append(candidate)
    generated = tokenizer.decode(produced, errors="replace").strip()
    return rewrite.restore(generated) if rewrite else generated
