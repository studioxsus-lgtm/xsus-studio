"""Use the same role markers during training and generation."""

from core.contracts.request import Conversation, ConversationRole

from ..tokenizer import ASSISTANT, BOS, EOS, USER, BytePairTokenizer


def prompt_tokens(tokenizer: BytePairTokenizer, conversation: Conversation) -> list[int]:
    tokens = [BOS]
    for turn in conversation.history:
        tokens.append(USER if turn.role is ConversationRole.USER else ASSISTANT)
        tokens.extend(tokenizer.encode(turn.text))
        if turn.role is ConversationRole.ASSISTANT:
            tokens.append(EOS)
    tokens.append(USER)
    tokens.extend(tokenizer.encode(conversation.text))
    tokens.append(ASSISTANT)
    return tokens
