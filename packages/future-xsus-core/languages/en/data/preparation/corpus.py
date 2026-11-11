"""Read and validate original XSUS English conversation data."""

import json
from dataclasses import dataclass
from pathlib import Path

from core.contracts.common import require_text
from core.contracts.request import Conversation, ConversationRole, ConversationTurn


@dataclass(frozen=True, slots=True)
class Example:
    conversation: Conversation
    response: str


def load_corpus(path: Path) -> tuple[Example, ...]:
    examples: list[Example] = []
    with path.open(encoding="utf-8") as source:
        for line_number, line in enumerate(source, start=1):
            try:
                row = json.loads(line)
                history = row.get("history", [])
                if not isinstance(history, list):
                    raise ValueError("history must be a list")
                turns = tuple(ConversationTurn(ConversationRole(turn["role"]), turn["text"]) for turn in history)
                require_text(row["response"], "response")
                examples.append(Example(Conversation(row["prompt"], turns), row["response"]))
            except (AttributeError, KeyError, TypeError, ValueError) as error:
                raise ValueError(f"Invalid corpus entry at {path}:{line_number}") from error
    if not examples:
        raise ValueError(f"Corpus is empty: {path}")
    return tuple(examples)


def validate_splits(training: tuple[Example, ...], evaluation: tuple[Example, ...]) -> None:
    def key(example: Example) -> tuple[str, tuple[tuple[ConversationRole, str], ...]]:
        conversation = example.conversation
        prompt = " ".join(conversation.text.casefold().split())
        history = tuple((turn.role, " ".join(turn.text.casefold().split())) for turn in conversation.history)
        return prompt, history

    training_keys = {key(example) for example in training}
    evaluation_keys = {key(example) for example in evaluation}
    if len(training_keys) != len(training) or len(evaluation_keys) != len(evaluation):
        raise ValueError("Duplicate conversation in a corpus split")
    if training_keys & evaluation_keys:
        raise ValueError("Training and evaluation conversations overlap")
