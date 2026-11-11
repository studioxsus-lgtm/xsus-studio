"""Share checkpoint-specific prompt preparation between training and inference."""

from core.contracts.request import Conversation

from .conversation_intents import canonical_prompt, normalize_rewrite_alias
from .rewrite_slots import PreparedRewrite, prepare_rewrite

PLAIN = "plain"
REWRITE_SLOTS = "rewrite-slots-v1"
CONVERSATION_V3 = "conversation-intents-v1"
FORMATS = (PLAIN, REWRITE_SLOTS, CONVERSATION_V3)


def prepare_model_input(
    conversation: Conversation, prompt_format: str,
) -> tuple[Conversation, PreparedRewrite | None]:
    if prompt_format == PLAIN:
        return conversation, None
    expanded = prompt_format == CONVERSATION_V3
    if expanded:
        conversation = normalize_rewrite_alias(conversation)
    rewrite = prepare_rewrite(conversation, expanded=expanded)
    if rewrite is not None:
        return rewrite.prompt, rewrite
    return (canonical_prompt(conversation) if expanded else conversation), None
