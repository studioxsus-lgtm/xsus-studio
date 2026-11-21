"""Read-only bridge from an existing XSUS English checkpoint to generation scoring.

The caller must supply separately curated holdout examples and attest that
they are independent; this bridge cannot independently prove dataset isolation.
No raw examples, prompts, or generations are returned.
"""
from pathlib import Path

from languages.en.models.checkpoint import load_checkpoint
from core.contracts.request import Conversation
from languages.en.text.normalization.model_input import prepare_model_input
from languages.en.text.generation.conversation_format import prompt_tokens
from languages.en.evaluation.frozen_generation_holdout_v1 import (
    inspect_frozen_generation_holdout_v1,
)


def inspect_checkpoint_generation_holdout_v1(
    checkpoint_path, prompts, references, *,
    independent_holdout=False, max_new_tokens=32,
):
    if independent_holdout is not True:
        raise ValueError("independent holdout attestation required")
    if not isinstance(prompts, (list, tuple)) or not isinstance(references, (list, tuple)):
        raise ValueError("prompts and references must be sequences")
    if len(prompts) < 2 or len(prompts) != len(references):
        raise ValueError("at least two aligned holdout examples required")
    if any(not (isinstance(prompt, str) and prompt.strip()) and
           not (isinstance(prompt, Conversation) and prompt.text.strip())
           for prompt in prompts):
        raise ValueError("nonempty prompt strings or conversations required")
    if any(not isinstance(reference, str) or not reference.strip() for reference in references):
        raise ValueError("nonempty reference strings required")
    tokenizer, model, revision = load_checkpoint(Path(checkpoint_path))
    prefixes = [
        prompt_tokens(tokenizer, prepare_model_input(prompt if isinstance(prompt, Conversation) else Conversation(prompt), model.prompt_format)[0])
        for prompt in prompts
    ]
    report = inspect_frozen_generation_holdout_v1(
        tokenizer, model, prefixes, references,
        independent_holdout=True, max_new_tokens=max_new_tokens,
    )
    return {
        "contract": "future-xsus-core.checkpoint-generation-holdout.v1",
        "checkpoint_revision": revision,
        "checkpoint_trained_context_size": model.context_size,
        "holdout_independence_attested_not_verified": True,
        "generation": report,
        "weights_retrained": False,
        "production_context_changed": False,
        "release_authorized": False,
        "raw_text_exposed": False,
        "raw_token_ids_exposed": False,
        "raw_logits_exposed": False,
    }
