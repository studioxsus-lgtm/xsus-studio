"""Contract between the conversation engine and a model runtime."""

from dataclasses import dataclass
from typing import Literal, Protocol


@dataclass(frozen=True, slots=True)
class Message:
    role: Literal["system", "user", "assistant"]
    content: str


class LanguageModel(Protocol):
    def generate(self, messages: tuple[Message, ...], *, language: str) -> str:
        """Return the model's response to the ordered messages."""
        ...
