"""Recognize supported v5 writing lessons without loading teaching answers."""

import json
import re
from functools import cache
from pathlib import Path

from core.contracts.request import Conversation

from .written_intents import canonical_written_prompt

_CATALOG = Path(__file__).with_name("written_topics_v5.json")
_LEAD_INS = (
    "Could you", "Can you", "Would you", "Could you please", "Can you please", "Would you please",
    "Please", "I'd like you to", "I need you to",
)
_TASKS = (
    "explain", "define", "describe", "summarize", "give me an overview of",
    "give me a quick guide to", "tell me about", "help me understand", "show me the basics of",
    "give me a short introduction to",
)
def _alternatives(phrases: tuple[str, ...]) -> str:
    return "|".join(re.escape(phrase.casefold()) for phrase in phrases)


_REQUESTS = tuple(re.compile(pattern) for pattern in (
    rf"(?:{_alternatives(_LEAD_INS)}) (?:{_alternatives(_TASKS)}) (?P<topic>.+)",
    r"what should an editor know about (?P<topic>.+)",
    r"give me a short writing lesson on (?P<topic>.+)",
    r"(?P<topic>.+): could you give a quick explanation",
))


@cache
def _topics() -> tuple[tuple[re.Pattern[str], str], ...]:
    rows = json.loads(_CATALOG.read_text(encoding="utf-8"))
    return tuple((re.compile(pattern), slug) for slug, pattern in rows)


def canonical_writing_v5(conversation: Conversation) -> Conversation:
    previous = canonical_written_prompt(conversation)
    if previous != conversation:
        return previous
    text = " ".join(conversation.text.casefold().replace("’", "'").split()).rstrip(".?!")
    for pattern in _REQUESTS:
        request = pattern.fullmatch(text)
        if request:
            for topic, slug in _topics():
                if topic.fullmatch(request["topic"]):
                    return Conversation(f"Explain writing lesson: {slug}.")
    return conversation
