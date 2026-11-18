"""Share checkpoint-specific prompt preparation between training and inference."""

from core.contracts.request import Conversation

from .conversation_intents import canonical_prompt, normalize_rewrite_alias
from .rewrite_slots import PreparedRewrite, prepare_rewrite
from .written_intents import canonical_written_prompt
from .written_v5 import canonical_writing_v5

PLAIN = "plain"
REWRITE_SLOTS = "rewrite-slots-v1"
CONVERSATION_V3 = "conversation-intents-v1"
WRITTEN_V4 = "written-english-v4"
WRITTEN_V5 = "written-english-v5"
FORMATS = (PLAIN, REWRITE_SLOTS, CONVERSATION_V3, WRITTEN_V4, WRITTEN_V5)


def prepare_model_input(
    conversation: Conversation, prompt_format: str,
) -> tuple[Conversation, PreparedRewrite | None]:
    if prompt_format == PLAIN:
        return conversation, None
    if prompt_format == WRITTEN_V5:
        written = canonical_writing_v5(conversation)
        if written != conversation:
            return written, None
    elif prompt_format == WRITTEN_V4:
        written = canonical_written_prompt(conversation)
        if written != conversation:
            return written, None
    expanded = prompt_format in (CONVERSATION_V3, WRITTEN_V4, WRITTEN_V5)
    if expanded:
        conversation = normalize_rewrite_alias(conversation)
    rewrite = prepare_rewrite(conversation, expanded=expanded)
    if rewrite is not None:
        return rewrite.prompt, rewrite
    return (canonical_prompt(conversation) if expanded else conversation), None
