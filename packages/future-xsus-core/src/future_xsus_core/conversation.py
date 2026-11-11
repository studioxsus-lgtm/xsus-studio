"""Prepare a text conversation and hand it to the selected model runtime."""

from collections.abc import Sequence

from .language import LanguageRegistry
from .runtime import LanguageModel, Message


class ConversationEngine:
    def __init__(self, languages: LanguageRegistry, model: LanguageModel) -> None:
        self._languages = languages
        self._model = model

    def respond(
        self,
        text: str,
        *,
        history: Sequence[Message] = (),
        language: str | None = None,
    ) -> str:
        if not isinstance(text, str) or not text.strip():
            raise ValueError("The user message must contain text")
        previous = tuple(history)
        for message in previous:
            if not isinstance(message, Message) or message.role not in ("user", "assistant"):
                raise ValueError("History must contain only user and assistant messages")
            if not isinstance(message.content, str) or not message.content.strip():
                raise ValueError("History messages must contain text")

        profile, instructions = self._languages.text_instructions(language)
        messages = (Message("system", instructions), *previous, Message("user", text))
        response = self._model.generate(messages, language=profile.tag)
        if not isinstance(response, str) or not response.strip():
            raise ValueError("The model returned an empty or invalid response")
        return response
