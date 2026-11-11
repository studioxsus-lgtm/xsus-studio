"""Separate values from the wording learned by the English rewrite model."""

import re
from dataclasses import dataclass

from core.contracts.request import Conversation, ConversationRole

_NAME = r"(?P<name>[A-Z][A-Za-z'’-]*(?: [A-Z][A-Za-z'’-]*)*)"
_ITEM = r"(?P<item>[A-Za-z][A-Za-z0-9 -]*?)"
_WHEN = r"(?P<when>(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?: at (?:noon|midnight|\d{1,2}(?::\d{2})? [ap]\.m\.))?)"
_SEND = re.compile(rf"^(?:{_NAME}, )?(?:(?:could|would|can) you please |please )?send (?P<me>me )?{_ITEM} by {_WHEN}[.!?]{{0,2}}$", re.IGNORECASE)
_WARM = re.compile(rf"^we need {_ITEM} from {_NAME} by {_WHEN}[.!?]{{0,2}}$", re.IGNORECASE)
_WARM_UNNAMED = re.compile(rf"^we need {_ITEM} by {_WHEN}[.!?]{{0,2}}$", re.IGNORECASE)
_WARM_REPLY = re.compile(rf"^(?:{_NAME}, )?we would appreciate receiving {_ITEM} by {_WHEN}[.!?]{{0,2}}$", re.IGNORECASE)
_SHORT = re.compile(rf"^i am writing to ask {_NAME} to send {_ITEM} by {_WHEN}[.!?]{{0,2}}$", re.IGNORECASE)
_COUNT = re.compile(rf"^(?:i am writing to ask you to )?bring (?P<count>\d+) {_ITEM}[.!?]?$", re.IGNORECASE)
_INSTRUCTION = re.compile(
    r"^(?P<instruction>[^:!?]+(?:[:?]|\.))\s+(?P<message>.+)$", re.IGNORECASE,
)
_ACTIONS = {
    "polite": re.compile(
        r"(?:(?:could|would|can) you )?(?:please )?make this(?: request)? (?:more )?(?:polite|courteous)"
    ),
    "warmer": re.compile(r"(?:please )?make this(?: request)? warmer"),
    "shorter": re.compile(r"(?:please )?(?:make this shorter|shorten this)"),
}


@dataclass(frozen=True, slots=True)
class PreparedRewrite:
    prompt: Conversation
    slots: tuple[tuple[str, str], ...]

    def mask(self, response: str) -> str:
        masked = response
        for marker, value in sorted(self.slots, key=lambda slot: -len(slot[1])):
            masked = re.sub(
                rf"(?<!\w){re.escape(value)}(?!\w)", lambda _match: marker, masked,
                count=1, flags=re.IGNORECASE,
            )
        return masked

    def restore(self, generated: str) -> str:
        for marker, value in self.slots:
            if generated.count(marker) != 1:
                return ""
            if value.endswith("."):
                generated = generated.replace(marker + ".", marker)
            generated = generated.replace(marker, value)
        return "" if "[[" in generated or "]]" in generated else generated


def _prepare(message: str, action: str, *, expanded: bool) -> PreparedRewrite | None:
    count = _COUNT.fullmatch(message)
    if count is not None and action in {"polite", "shorter"}:
        prompt = f"Make this {action}: Bring [[COUNT]] [[ITEM]]."
        return PreparedRewrite(Conversation(prompt), (("[[COUNT]]", count["count"]), ("[[ITEM]]", count["item"])))

    delivery = _WARM.fullmatch(message) or _SHORT.fullmatch(message) or _SEND.fullmatch(message)
    if delivery is None and expanded and action == "warmer":
        delivery = _WARM_UNNAMED.fullmatch(message)
    if delivery is None and expanded and action == "shorter":
        delivery = _WARM_REPLY.fullmatch(message)
    if delivery is None:
        return None
    values = delivery.groupdict()
    slots = [("[[ITEM]]", values["item"]), ("[[WHEN]]", values["when"])]
    if values.get("name") is not None:
        slots.insert(0, ("[[NAME]]", values["name"]))
    if action == "warmer":
        if values.get("name") is not None:
            text = "We need [[ITEM]] from [[NAME]] by [[WHEN]]."
        elif expanded:
            text = "We need [[ITEM]] by [[WHEN]]."
        else:
            return None
    elif action == "shorter" and values.get("name") is not None:
        text = "I am writing to ask [[NAME]] to send [[ITEM]] by [[WHEN]]."
    else:
        name = "[[NAME]], " if values.get("name") is not None else ""
        recipient = "me " if values.get("me") else ""
        text = f"{name}send {recipient}[[ITEM]] by [[WHEN]]."
    return PreparedRewrite(Conversation(f"Make this {action}: {text}"), tuple(slots))


def prepare_rewrite(conversation: Conversation, *, expanded: bool = False) -> PreparedRewrite | None:
    prompt = conversation.text.strip()
    if prompt.casefold() in {"make it shorter.", "make it shorter"}:
        if conversation.history and conversation.history[-1].role is ConversationRole.ASSISTANT:
            return _prepare(conversation.history[-1].text.strip(), "shorter", expanded=expanded)
        return None
    instruction = _INSTRUCTION.fullmatch(prompt)
    if instruction is None:
        return None
    command = instruction["instruction"].casefold().rstrip(":?.!").strip()
    for action, pattern in _ACTIONS.items():
        if pattern.fullmatch(command):
            return _prepare(instruction["message"].strip(), action, expanded=expanded)
    return None
